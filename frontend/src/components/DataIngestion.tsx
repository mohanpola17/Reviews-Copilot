import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { reviewsAPI } from '../services/api';
import { Review } from '../types';

const DataIngestion = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    setFile(selectedFile);
    setMessage('');
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage('Please select a file to upload');
      setMessageType('error');
      return;
    }

    try {
      setUploading(true);
      setMessage('');

      const fileContent = await readFileContent(file);
      const reviews: Review[] = JSON.parse(fileContent);

      // Validate the data structure
      if (!Array.isArray(reviews)) {
        throw new Error('File must contain an array of reviews');
      }

      // Validate each review
      for (const review of reviews) {
        if (!review.id || !review.location || !review.rating || !review.text || !review.date) {
          throw new Error('Each review must have id, location, rating, text, and date fields');
        }
        if (review.rating < 1 || review.rating > 5) {
          throw new Error('Rating must be between 1 and 5');
        }
      }

      const result = await reviewsAPI.ingestReviews(reviews);
      setMessage(result.message);
      setMessageType('success');
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setUploading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const handleProcessReviews = async () => {
    try {
      setProcessing(true);
      setMessage('');
      
      const result = await reviewsAPI.processReviews();
      setMessage(result.message);
      setMessageType('success');
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setMessageType('error');
    } finally {
      setProcessing(false);
    }
  };

  const sampleData = [
    {
      "id": 1,
      "location": "NYC",
      "rating": 5,
      "text": "Great service and amazing food!",
      "date": "2025-01-15"
    },
    {
      "id": 2,
      "location": "SF",
      "rating": 3,
      "text": "Average experience, could be better.",
      "date": "2025-01-16"
    }
  ];

  const downloadSampleData = () => {
    const dataStr = JSON.stringify(sampleData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'sample_reviews.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div>
      <div className="card">
        <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
          <Upload size={20} style={{ marginRight: '0.5rem' }} />
          Data Ingestion
        </h2>
        
        <p style={{ marginBottom: '2rem', color: '#6b7280' }}>
          Upload a JSON file containing reviews data. Each review should have id, location, rating (1-5), text, and date fields.
        </p>

        {message && (
          <div className={messageType === 'error' ? 'error' : 'success'}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {messageType === 'error' ? (
                <AlertCircle size={16} style={{ marginRight: '0.5rem' }} />
              ) : (
                <CheckCircle size={16} style={{ marginRight: '0.5rem' }} />
              )}
              {message}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Select JSON File</label>
          <input
            id="file-input"
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="form-input"
            style={{ padding: '0.5rem' }}
          />
          {file && (
            <div style={{ marginTop: '0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
              Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} style={{ marginRight: '0.5rem' }} />
                Upload Reviews
              </>
            )}
          </button>

          <button
            className="btn btn-secondary"
            onClick={downloadSampleData}
          >
            <FileText size={16} style={{ marginRight: '0.5rem' }} />
            Download Sample Data
          </button>
        </div>

        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>AI Processing</h3>
          <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
            Process all reviews to add sentiment analysis and topic extraction using AI.
          </p>
          
          <button
            className="btn btn-success"
            onClick={handleProcessReviews}
            disabled={processing}
          >
            {processing ? (
              <>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                Processing...
              </>
            ) : (
              <>
                <RefreshCw size={16} style={{ marginRight: '0.5rem' }} />
                Process All Reviews
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Data Format</h3>
        <p style={{ marginBottom: '1rem', color: '#6b7280' }}>
          Your JSON file should contain an array of review objects with the following structure:
        </p>
        
        <div style={{ 
          background: '#f8fafc', 
          border: '1px solid #e2e8f0', 
          borderRadius: '6px', 
          padding: '1rem',
          fontFamily: 'monospace',
          fontSize: '0.875rem',
          overflow: 'auto'
        }}>
          {JSON.stringify(sampleData, null, 2)}
        </div>

        <div style={{ marginTop: '1rem' }}>
          <h4>Field Requirements:</h4>
          <ul style={{ marginLeft: '1.5rem', color: '#6b7280' }}>
            <li><strong>id</strong>: Unique identifier (integer)</li>
            <li><strong>location</strong>: Location name (string)</li>
            <li><strong>rating</strong>: Rating from 1 to 5 (integer)</li>
            <li><strong>text</strong>: Review text content (string)</li>
            <li><strong>date</strong>: Review date in YYYY-MM-DD format (string)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataIngestion;
