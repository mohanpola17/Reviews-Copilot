"""
Database management and connection handling
Provides connection pooling, query optimization, and error handling
"""

import sqlite3
import logging
import threading
from contextlib import contextmanager
from typing import Optional, Dict, Any, List, Tuple, Generator
from pathlib import Path
import json
import time
from functools import wraps

from config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class DatabaseManager:
    """Manages database connections and operations"""
    
    def __init__(self, db_path: str = None):
        self.db_path = db_path or settings.database_url.replace("sqlite:///", "")
        self._local = threading.local()
        self._connection_count = 0
        self._max_connections = settings.database_pool_size
        self._lock = threading.Lock()
        
        # Ensure database directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database schema
        self._init_schema()
    
    def _init_schema(self):
        """Initialize database schema with proper indexing"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                
                # Create reviews table with proper constraints and indexes
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS reviews (
                        id INTEGER PRIMARY KEY,
                        location TEXT NOT NULL,
                        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                        text TEXT NOT NULL,
                        date TEXT NOT NULL,
                        sentiment TEXT,
                        topic TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        processed_at TIMESTAMP,
                        metadata TEXT
                    )
                ''')
                
                # Create indexes for better performance
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_location 
                    ON reviews(location)
                ''')
                
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_rating 
                    ON reviews(rating)
                ''')
                
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_sentiment 
                    ON reviews(sentiment)
                ''')
                
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_topic 
                    ON reviews(topic)
                ''')
                
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_created_at 
                    ON reviews(created_at)
                ''')
                
                cursor.execute('''
                    CREATE INDEX IF NOT EXISTS idx_reviews_text_search 
                    ON reviews(text)
                ''')
                
                # Create search table for TF-IDF vectors
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS search_vectors (
                        review_id INTEGER PRIMARY KEY,
                        vector_data TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (review_id) REFERENCES reviews (id)
                    )
                ''')
                
                # Create analytics cache table
                cursor.execute('''
                    CREATE TABLE IF NOT EXISTS analytics_cache (
                        cache_key TEXT PRIMARY KEY,
                        data TEXT NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        expires_at TIMESTAMP
                    )
                ''')
                
                conn.commit()
                logger.info("Database schema initialized successfully")
                
        except Exception as e:
            logger.error(f"Failed to initialize database schema: {str(e)}")
            raise
    
    @contextmanager
    def get_connection(self) -> Generator[sqlite3.Connection, None, None]:
        """Get database connection with proper error handling"""
        conn = None
        try:
            with self._lock:
                if self._connection_count >= self._max_connections:
                    logger.warning("Connection pool exhausted, waiting...")
                    time.sleep(0.1)
            
            conn = sqlite3.connect(
                self.db_path,
                timeout=30.0,
                check_same_thread=False
            )
            conn.row_factory = sqlite3.Row  # Enable column access by name
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("PRAGMA journal_mode = WAL")  # Better concurrency
            conn.execute("PRAGMA synchronous = NORMAL")  # Balance safety/speed
            
            with self._lock:
                self._connection_count += 1
            
            yield conn
            
        except sqlite3.Error as e:
            logger.error(f"Database error: {str(e)}")
            if conn:
                conn.rollback()
            raise
        except Exception as e:
            logger.error(f"Unexpected database error: {str(e)}")
            if conn:
                conn.rollback()
            raise
        finally:
            if conn:
                try:
                    conn.close()
                    with self._lock:
                        self._connection_count = max(0, self._connection_count - 1)
                except Exception as e:
                    logger.error(f"Error closing connection: {str(e)}")
    
    def execute_query(self, query: str, params: Tuple = (), fetch_one: bool = False, fetch_all: bool = True) -> Any:
        """Execute a query with proper error handling"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                
                if fetch_one:
                    return cursor.fetchone()
                elif fetch_all:
                    return cursor.fetchall()
                else:
                    conn.commit()
                    return cursor.rowcount
                    
        except sqlite3.Error as e:
            logger.error(f"Query execution failed: {str(e)}")
            logger.error(f"Query: {query}")
            logger.error(f"Params: {params}")
            raise
    
    def execute_many(self, query: str, params_list: List[Tuple]) -> int:
        """Execute a query multiple times with different parameters"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.executemany(query, params_list)
                conn.commit()
                return cursor.rowcount
        except sqlite3.Error as e:
            logger.error(f"Batch execution failed: {str(e)}")
            raise
    
    def get_review_by_id(self, review_id: int) -> Optional[Dict[str, Any]]:
        """Get a single review by ID"""
        query = '''
            SELECT id, location, rating, text, date, sentiment, topic, 
                   created_at, updated_at, processed_at, metadata
            FROM reviews WHERE id = ?
        '''
        result = self.execute_query(query, (review_id,), fetch_one=True)
        return dict(result) if result else None
    
    def get_reviews_paginated(self, filters: Dict[str, Any], page: int, page_size: int) -> Tuple[List[Dict[str, Any]], int]:
        """Get paginated reviews with filters"""
        where_conditions = []
        params = []
        
        # Build WHERE clause based on filters
        if filters.get('location'):
            where_conditions.append("location = ?")
            params.append(filters['location'])
        
        if filters.get('sentiment'):
            where_conditions.append("sentiment = ?")
            params.append(filters['sentiment'])
        
        if filters.get('q'):
            where_conditions.append("text LIKE ?")
            params.append(f"%{filters['q']}%")
        
        if filters.get('rating_min'):
            where_conditions.append("rating >= ?")
            params.append(filters['rating_min'])
        
        if filters.get('rating_max'):
            where_conditions.append("rating <= ?")
            params.append(filters['rating_max'])
        
        if filters.get('date_from'):
            where_conditions.append("date >= ?")
            params.append(filters['date_from'])
        
        if filters.get('date_to'):
            where_conditions.append("date <= ?")
            params.append(filters['date_to'])
        
        where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
        
        # Get total count
        count_query = f"SELECT COUNT(*) FROM reviews{where_clause}"
        total = self.execute_query(count_query, params, fetch_one=True)[0]
        
        # Get paginated results
        offset = (page - 1) * page_size
        query = f'''
            SELECT id, location, rating, text, date, sentiment, topic, 
                   created_at, updated_at, processed_at, metadata
            FROM reviews{where_clause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        '''
        
        results = self.execute_query(query, params + [page_size, offset])
        return [dict(row) for row in results], total
    
    def insert_reviews(self, reviews: List[Dict[str, Any]]) -> int:
        """Insert multiple reviews efficiently"""
        query = '''
            INSERT OR REPLACE INTO reviews 
            (id, location, rating, text, date, sentiment, topic, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        '''
        
        params_list = []
        for review in reviews:
            metadata = json.dumps({
                'source': 'api',
                'processed': False
            })
            params_list.append((
                review['id'],
                review['location'],
                review['rating'],
                review['text'],
                review['date'],
                review.get('sentiment'),
                review.get('topic'),
                metadata
            ))
        
        return self.execute_many(query, params_list)
    
    def update_review_ai_data(self, review_id: int, sentiment: str, topic: str) -> bool:
        """Update review with AI analysis results"""
        query = '''
            UPDATE reviews 
            SET sentiment = ?, topic = ?, processed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        '''
        
        try:
            rows_affected = self.execute_query(query, (sentiment, topic, review_id), fetch_all=False)
            return rows_affected > 0
        except Exception as e:
            logger.error(f"Failed to update review {review_id}: {str(e)}")
            return False
    
    def get_analytics_data(self) -> Dict[str, Any]:
        """Get analytics data with caching"""
        cache_key = "analytics_data"
        
        # Check cache first
        cache_query = '''
            SELECT data, expires_at FROM analytics_cache 
            WHERE cache_key = ? AND expires_at > CURRENT_TIMESTAMP
        '''
        cached = self.execute_query(cache_query, (cache_key,), fetch_one=True)
        
        if cached:
            return json.loads(cached[0])
        
        # Generate fresh analytics data
        analytics = {}
        
        # Sentiment counts
        sentiment_query = "SELECT sentiment, COUNT(*) FROM reviews WHERE sentiment IS NOT NULL GROUP BY sentiment"
        sentiment_results = self.execute_query(sentiment_query)
        analytics['sentiment_counts'] = dict(sentiment_results)
        
        # Topic counts
        topic_query = "SELECT topic, COUNT(*) FROM reviews WHERE topic IS NOT NULL GROUP BY topic"
        topic_results = self.execute_query(topic_query)
        analytics['topic_counts'] = dict(topic_results)
        
        # Location counts
        location_query = "SELECT location, COUNT(*) FROM reviews GROUP BY location"
        location_results = self.execute_query(location_query)
        analytics['location_counts'] = dict(location_results)
        
        # Rating distribution
        rating_query = "SELECT rating, COUNT(*) FROM reviews GROUP BY rating ORDER BY rating"
        rating_results = self.execute_query(rating_query)
        analytics['rating_distribution'] = dict(rating_results)
        
        # Cache the results for 5 minutes
        cache_data = json.dumps(analytics)
        expires_at = time.time() + 300  # 5 minutes
        
        cache_insert = '''
            INSERT OR REPLACE INTO analytics_cache (cache_key, data, expires_at)
            VALUES (?, ?, ?)
        '''
        self.execute_query(cache_insert, (cache_key, cache_data, expires_at), fetch_all=False)
        
        return analytics
    
    def cleanup_old_cache(self):
        """Clean up expired cache entries"""
        query = "DELETE FROM analytics_cache WHERE expires_at < CURRENT_TIMESTAMP"
        try:
            self.execute_query(query, fetch_all=False)
        except Exception as e:
            logger.error(f"Failed to cleanup cache: {str(e)}")

# Global database manager instance
db_manager = DatabaseManager()

def get_db_manager() -> DatabaseManager:
    """Get database manager instance"""
    return db_manager
