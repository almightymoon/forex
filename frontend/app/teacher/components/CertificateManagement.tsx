'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Upload, Edit, Trash2, Copy, Eye, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CertificateTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  backgroundImage?: string;
  backgroundColor: string;
  isPublic: boolean;
  usageCount: number;
  tags: string[];
  createdBy: {
    _id: string;
    name: string;
  };
}

export default function CertificateTemplateManager() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTemplate, setActiveTemplate] = useState<CertificateTemplate | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/certificate-templates', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (error) {
      toast.error('Failed to fetch templates');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificate-templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Template deleted');
        setTemplates((prev) => prev.filter((t) => t._id !== id));
      } else toast.error('Delete failed');
    } catch {
      toast.error('Error deleting template');
    }
  };

  const duplicateTemplate = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/certificate-templates/${id}/duplicate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        toast.success('Template duplicated');
        fetchTemplates();
      } else toast.error('Duplicate failed');
    } catch {
      toast.error('Error duplicating template');
    }
  };

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Certificate Templates</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Template
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border rounded-lg"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="all">All</option>
            <option value="academic">Academic</option>
            <option value="professional">Professional</option>
            <option value="achievement">Achievement</option>
            <option value="completion">Completion</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <p className="text-center py-12">Loading templates...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-12 text-gray-600">No templates found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((t) => (
              <div key={t._id} className="bg-white rounded-lg border shadow-sm">
                <div
                  className="h-40 rounded-t-lg bg-center bg-cover"
                  style={{
                    background: t.backgroundImage
                      ? `url(${t.backgroundImage}) center/cover`
                      : t.backgroundColor,
                  }}
                />
                <div className="p-4">
                  <h3 className="font-semibold">{t.name}</h3>
                  <p className="text-sm text-gray-600">{t.description || 'No description'}</p>
                  <div className="flex justify-between mt-3 text-sm text-gray-500">
                    <span>{t.category}</span>
                    <span>{t.usageCount} uses</span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setActiveTemplate(t)} className="p-2 text-gray-600 hover:text-blue-600">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => duplicateTemplate(t._id)} className="p-2 text-gray-600 hover:text-green-600">
                      <Copy className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteTemplate(t._id)} className="p-2 text-gray-600 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {activeTemplate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg max-w-3xl w-full p-6 relative">
            <button
              onClick={() => setActiveTemplate(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
            <h2 className="text-xl font-bold mb-4">{activeTemplate.name}</h2>
            <div
              className="w-full h-96 border rounded-lg bg-center bg-cover"
              style={{
                background: activeTemplate.backgroundImage
                  ? `url(${activeTemplate.backgroundImage}) center/cover`
                  : activeTemplate.backgroundColor,
              }}
            />
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal (simplified) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-xl font-bold mb-4">Create Template</h2>
            {/* form fields */}
            {/* TODO: Add controlled inputs for name, description, category, backgroundColor, backgroundImage */}
            <button
              onClick={() => setIsFormOpen(false)}
              className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
