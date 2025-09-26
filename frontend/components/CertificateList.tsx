'use client';

import React, { useState, useEffect } from 'react';
import { Download, Eye, CheckCircle, Calendar, Award, User, BookOpen } from 'lucide-react';

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

interface CertificateListProps {
  certificates: Certificate[];
  loading?: boolean;
}

export default function CertificateList({ certificates, loading }: CertificateListProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleDownload = async (certificateId: string, courseTitle: string) => {
    try {
      const response = await fetch(`/api/certificates/download/${certificateId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseTitle}_Certificate.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Failed to download certificate');
        alert('Failed to download certificate');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download certificate');
    }
  };

  const handleView = (certificate: Certificate) => {
    setSelectedCertificate(certificate);
    setShowModal(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading certificates...</span>
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Certificates Yet</h3>
        <p className="text-gray-500">
          Complete courses to earn certificates! Certificates are automatically generated when you complete 90% or more of a course.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((certificate) => (
          <div
            key={certificate.id}
            className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Certificate Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <Award className="h-6 w-6" />
                <span className="text-sm font-medium">Certificate</span>
              </div>
            </div>

            {/* Certificate Content */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {certificate.courseTitle}
              </h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <User className="h-4 w-4 mr-2" />
                  <span>{certificate.studentName}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>Completed: {formatDate(certificate.completionDate)}</span>
                </div>
                
                <div className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                  <span>{certificate.completionPercentage}% Complete</span>
                </div>
              </div>

              {/* Certificate ID */}
              <div className="bg-gray-50 rounded-md p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Certificate ID</p>
                <p className="text-sm font-mono text-gray-700">{certificate.certificateId}</p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleView(certificate)}
                  className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                <button
                  onClick={() => handleDownload(certificate.certificateId, certificate.courseTitle)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Modal */}
      {showModal && selectedCertificate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Certificate Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white text-center">
                  <Award className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Certificate of Completion</h3>
                  <p className="text-blue-100">Trading Education Platform</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Student Name</label>
                    <p className="text-lg text-gray-900">{selectedCertificate.studentName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Course Title</label>
                    <p className="text-lg text-gray-900">{selectedCertificate.courseTitle}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completion Date</label>
                    <p className="text-lg text-gray-900">{formatDate(selectedCertificate.completionDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Completion Rate</label>
                    <p className="text-lg text-gray-900">{selectedCertificate.completionPercentage}%</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Instructor</label>
                    <p className="text-lg text-gray-900">{selectedCertificate.instructorName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Valid Until</label>
                    <p className="text-lg text-gray-900">{formatDate(selectedCertificate.validUntil)}</p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Certificate ID</label>
                  <p className="font-mono text-sm text-gray-700">{selectedCertificate.certificateId}</p>
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={() => handleDownload(selectedCertificate.certificateId, selectedCertificate.courseTitle)}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download PDF
                  </button>
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
