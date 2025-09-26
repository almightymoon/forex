'use client';

import React, { useState, useEffect } from 'react';
import { Award, Download, Eye, Calendar, User, BookOpen } from 'lucide-react';
import CertificateList from '../../components/CertificateList';

interface Certificate {
  id: string;
  certificateId: string;
  certificateUrl: string;
  completionDate: string;
  completionPercentage: number;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  validUntil: string;
  course: {
    title: string;
    description: string;
    thumbnail: string;
  };
}

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/certificates/my-certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Certificates data:', data);
        setCertificates(data.certificates || []);
      } else {
        const errorData = await response.json();
        console.error('Error fetching certificates:', errorData);
        setError(errorData.error || 'Failed to fetch certificates');
      }
    } catch (err) {
      console.error('Error fetching certificates:', err);
      setError('Failed to fetch certificates');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (courseId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/certificates/generate/${courseId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Refresh certificates list
          fetchCertificates();
          alert('Certificate generated successfully!');
        }
      } else {
        const errorData = await response.json();
        alert(errorData.message || 'Failed to generate certificate');
      }
    } catch (err) {
      console.error('Error generating certificate:', err);
      alert('Failed to generate certificate');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Certificates</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={fetchCertificates}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Award className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          </div>
          <p className="text-gray-600">
            View and download your course completion certificates. Certificates are automatically generated when you complete 90% or more of a course.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Total Certificates</p>
                <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Courses Completed</p>
                <p className="text-2xl font-bold text-gray-900">{certificates.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-500">Latest Certificate</p>
                <p className="text-sm text-gray-900">
                  {certificates.length > 0 
                    ? new Date(certificates[0].completionDate).toLocaleDateString()
                    : 'None'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Certificates List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Your Certificates</h2>
          </div>
          <div className="p-6">
            <CertificateList certificates={certificates} loading={loading} />
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-2">About Certificates</h3>
          <div className="text-blue-800 space-y-2">
            <p>• Certificates are automatically generated when you complete 90% or more of a course</p>
            <p>• Each certificate includes a unique ID for verification</p>
            <p>• Certificates are valid for 2 years from the completion date</p>
            <p>• You can download certificates as PDF files</p>
            <p>• Certificates can be verified online using the certificate ID</p>
          </div>
        </div>
      </div>
    </div>
  );
}
