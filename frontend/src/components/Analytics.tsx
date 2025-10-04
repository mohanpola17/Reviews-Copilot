import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, TrendingUp, Users, Star } from 'lucide-react';
import { reviewsAPI } from '../services/api';
import { AnalyticsResponse } from '../types';

const Analytics = () => {
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reviewsAPI.getAnalytics();
      setAnalytics(data);
    } catch (err) {
      setError('Failed to load analytics. Please try again.');
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'];

  const prepareChartData = (data: Record<string, number>, type: string) => {
    return Object.entries(data).map(([key, value]) => ({
      name: key,
      value: value,
      count: value
    }));
  };

  const getTotalReviews = () => {
    if (!analytics) return 0;
    return analytics.total_reviews;
  };

  const getAverageRating = () => {
    if (!analytics) return 0;
    const ratingData = analytics.rating_distribution;
    const totalReviews = Object.values(ratingData).reduce((sum, count) => sum + count, 0);
    const weightedSum = Object.entries(ratingData).reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
    return totalReviews > 0 ? (weightedSum / totalReviews).toFixed(1) : 0;
  };

  const getSentimentDistribution = () => {
    if (!analytics) return { positive: 0, negative: 0, neutral: 0 };
    const sentimentData = analytics.sentiment_counts;
    return {
      positive: sentimentData.positive || 0,
      negative: sentimentData.negative || 0,
      neutral: sentimentData.neutral || 0,
    };
  };

  if (loading) {
    return (
      <div className="loading">
        <div>Loading analytics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
        <div style={{ marginTop: '1rem' }}>
          <button className="btn btn-primary" onClick={loadAnalytics}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="error">
        No analytics data available
      </div>
    );
  }

  const sentimentData = prepareChartData(analytics.sentiment_counts, 'sentiment');
  const topicData = prepareChartData(analytics.topic_counts, 'topic');
  const locationData = prepareChartData(analytics.location_counts, 'location');
  const ratingData = prepareChartData(analytics.rating_distribution, 'rating');

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
          <BarChart3 size={20} style={{ marginRight: '0.5rem' }} />
          Analytics Dashboard
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <Users size={24} style={{ color: '#0369a1', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0369a1' }}>
              {getTotalReviews()}
            </div>
            <div style={{ color: '#6b7280' }}>Total Reviews</div>
          </div>
          
          <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <Star size={24} style={{ color: '#16a34a', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>
              {getAverageRating()}
            </div>
            <div style={{ color: '#6b7280' }}>Average Rating</div>
          </div>
          
          <div style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <TrendingUp size={24} style={{ color: '#d97706', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>
              {getSentimentDistribution().positive}
            </div>
            <div style={{ color: '#6b7280' }}>Positive Reviews</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {/* Sentiment Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Sentiment Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sentimentData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Rating Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Rating Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#667eea" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Location Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Reviews by Location</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#764ba2" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topic Distribution */}
        <div className="chart-container">
          <h3 className="chart-title">Reviews by Topic</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topicData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#f093fb" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="card">
        <h3>Detailed Statistics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <h4>Sentiment Breakdown</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {Object.entries(analytics.sentiment_counts).map(([sentiment, count]) => (
                <li key={sentiment} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <span className={sentiment === 'positive' ? 'sentiment positive' : 
                                   sentiment === 'negative' ? 'sentiment negative' : 
                                   'sentiment neutral'}>
                    {sentiment}
                  </span>
                  <span style={{ fontWeight: 'bold' }}>{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Location Breakdown</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {Object.entries(analytics.location_counts).map(([location, count]) => (
                <li key={location} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <span>{location}</span>
                  <span style={{ fontWeight: 'bold' }}>{count}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Topic Breakdown</h4>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {Object.entries(analytics.topic_counts).map(([topic, count]) => (
                <li key={topic} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '0.5rem 0',
                  borderBottom: '1px solid #e2e8f0'
                }}>
                  <span className="topic">{topic}</span>
                  <span style={{ fontWeight: 'bold' }}>{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
