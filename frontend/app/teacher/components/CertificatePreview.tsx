'use client';

import React from 'react';
import { Award, Calendar, User, BookOpen } from 'lucide-react';

interface CertificatePreviewProps {
  template: {
    backgroundColor: string;
    textColor: string;
    borderColor: string;
    borderStyle: string;
    borderWidth: number;
    layout: string;
    fontSize: {
      title: number;
      subtitle: number;
      body: number;
    };
  };
  studentName?: string;
  courseTitle?: string;
  grade?: number;
  instructorName?: string;
}

export default function CertificatePreview({ 
  template, 
  studentName = "John Doe", 
  courseTitle = "Sample Course", 
  grade = 85, 
  instructorName = "Dr. Smith" 
}: CertificatePreviewProps) {
  const getLayoutStyle = () => {
    switch (template.layout) {
      case 'classic':
        return 'text-center space-y-6';
      case 'modern':
        return 'text-left space-y-4';
      case 'minimal':
        return 'text-center space-y-3';
      case 'elegant':
        return 'text-center space-y-8';
      default:
        return 'text-center space-y-6';
    }
  };

  const getBorderStyle = () => {
    if (template.borderStyle === 'none') return '';
    return `${template.borderWidth}px ${template.borderStyle} ${template.borderColor}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div 
        className="relative overflow-hidden rounded-lg shadow-2xl"
        style={{
          backgroundColor: template.backgroundColor,
          border: getBorderStyle(),
          minHeight: '600px'
        }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <defs>
                <pattern id="certificate-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="1" fill={template.textColor} />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#certificate-pattern)" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className={`relative p-12 ${getLayoutStyle()}`}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center mb-4">
              <Award 
                className="w-16 h-16" 
                style={{ color: template.textColor }}
              />
            </div>
            <h1 
              className="font-bold uppercase tracking-widest"
              style={{ 
                color: template.textColor,
                fontSize: `${template.fontSize.title}px`
              }}
            >
              Certificate of Completion
            </h1>
          </div>

          {/* Main Content */}
          <div className="mb-8">
            <p 
              className="mb-6"
              style={{ 
                color: template.textColor,
                fontSize: `${template.fontSize.body}px`
              }}
            >
              This is to certify that
            </p>
            
            <h2 
              className="font-bold mb-6"
              style={{ 
                color: template.textColor,
                fontSize: `${template.fontSize.title + 8}px`
              }}
            >
              {studentName}
            </h2>
            
            <p 
              className="mb-6"
              style={{ 
                color: template.textColor,
                fontSize: `${template.fontSize.body}px`
              }}
            >
              has successfully completed the course
            </p>
            
            <h3 
              className="font-semibold mb-8"
              style={{ 
                color: template.textColor,
                fontSize: `${template.fontSize.subtitle}px`
              }}
            >
              {courseTitle}
            </h3>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <User className="w-6 h-6" style={{ color: template.textColor }} />
              </div>
              <p 
                className="text-sm opacity-75"
                style={{ color: template.textColor }}
              >
                Student
              </p>
              <p 
                className="font-medium"
                style={{ 
                  color: template.textColor,
                  fontSize: `${template.fontSize.body}px`
                }}
              >
                {studentName}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="w-6 h-6" style={{ color: template.textColor }} />
              </div>
              <p 
                className="text-sm opacity-75"
                style={{ color: template.textColor }}
              >
                Course
              </p>
              <p 
                className="font-medium"
                style={{ 
                  color: template.textColor,
                  fontSize: `${template.fontSize.body}px`
                }}
              >
                {courseTitle}
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Award className="w-6 h-6" style={{ color: template.textColor }} />
              </div>
              <p 
                className="text-sm opacity-75"
                style={{ color: template.textColor }}
              >
                Grade
              </p>
              <p 
                className="font-medium"
                style={{ 
                  color: template.textColor,
                  fontSize: `${template.fontSize.body}px`
                }}
              >
                {grade}%
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12">
            <div className="flex items-center justify-between">
              <div className="text-left">
                <p 
                  className="text-sm opacity-75 mb-1"
                  style={{ color: template.textColor }}
                >
                  Issued by
                </p>
                <p 
                  className="font-semibold"
                  style={{ 
                    color: template.textColor,
                    fontSize: `${template.fontSize.body}px`
                  }}
                >
                  {instructorName}
                </p>
              </div>
              
              <div className="text-right">
                <p 
                  className="text-sm opacity-75 mb-1"
                  style={{ color: template.textColor }}
                >
                  Date
                </p>
                <p 
                  className="font-semibold"
                  style={{ 
                    color: template.textColor,
                    fontSize: `${template.fontSize.body}px`
                  }}
                >
                  {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Number */}
          <div className="absolute bottom-4 right-4">
            <p 
              className="text-xs opacity-50"
              style={{ color: template.textColor }}
            >
              CERT-{Date.now()}
            </p>
          </div>
        </div>
      </div>

      {/* Template Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Template Details</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Layout:</span> {template.layout}
          </div>
          <div>
            <span className="font-medium">Border:</span> {template.borderStyle} {template.borderWidth}px
          </div>
          <div>
            <span className="font-medium">Title Size:</span> {template.fontSize.title}px
          </div>
          <div>
            <span className="font-medium">Body Size:</span> {template.fontSize.body}px
          </div>
        </div>
      </div>
    </div>
  );
}
