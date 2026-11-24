import React, { useState, useEffect } from 'react';
import { FolderOpen, Upload, Download, FileText, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { api } from '../../lib/api';
import { DocumentItem } from '../../types';
import { Modal } from '../../components/Modal';

export function DocumentRepository() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [entityType, setEntityType] = useState('QUOTATION');
  const [proposalId, setProposalId] = useState('');
  const [proposals, setProposals] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDocuments();
    api.getProposals().then(setProposals).catch(console.error);
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await api.getDocuments();
      setDocuments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      if (proposalId) formData.append('proposalId', proposalId);

      await api.uploadDocument(formData);
      setShowUploadModal(false);
      setFile(null);
      await loadDocuments();
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-brand-600" />
            Centralized Document &amp; Technical File Repository
          </h1>
          <p className="text-xs text-industrial-500">
            Secure digital repository for OEM quotations, technical specifications, CAD layout drawings, FAT certificates &amp; invoices
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-industrial-900 rounded-xl border border-industrial-200 dark:border-industrial-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-industrial-400">
            No files uploaded in repository.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-industrial-50 dark:bg-industrial-800/40 text-industrial-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Linked Proposal</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Uploaded By</th>
                  <th className="p-3.5">Uploaded Date</th>
                  <th className="p-3.5 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-industrial-100 dark:divide-industrial-800">
                {documents.map((d) => (
                  <tr key={d.id} className="hover:bg-industrial-50 dark:hover:bg-industrial-800/50">
                    <td className="p-3.5 font-semibold text-industrial-900 dark:text-industrial-100 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                      <span className="truncate max-w-xs">{d.fileName}</span>
                    </td>

                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-industrial-100 dark:bg-industrial-800">
                        {d.entityType}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-brand-600">
                      {d.proposal?.proposalNumber || 'General Document'}
                    </td>

                    <td className="p-3.5 font-mono text-industrial-500">
                      {(d.fileSize / 1024).toFixed(1)} KB
                    </td>

                    <td className="p-3.5 text-industrial-700 dark:text-industrial-300">
                      {d.uploadedBy?.name || 'User'}
                    </td>

                    <td className="p-3.5 text-industrial-400">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-3.5 text-right">
                      <a
                        href={d.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-brand-50 text-brand-600 hover:bg-brand-100 text-[11px] font-bold"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UPLOAD MODAL */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Document into Enterprise Repository"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-700 font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold mb-1">Choose File (PDF, Images, Word, Excel) *</label>
            <input
              type="file"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-industrial-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Document Category *</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="QUOTATION">Vendor Quotation PDF</option>
              <option value="SPECIFICATION">Technical Specification / Drawing</option>
              <option value="FAT_CERTIFICATE">Factory Acceptance (FAT) Certificate</option>
              <option value="INVOICE">Commercial Invoice</option>
              <option value="GENERAL">General Operational Doc</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Associate with Proposal (Optional)</label>
            <select
              value={proposalId}
              onChange={(e) => setProposalId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-industrial-50 dark:bg-industrial-800 border border-industrial-200 dark:border-industrial-700 text-industrial-900 dark:text-industrial-100"
            >
              <option value="">No proposal association</option>
              {proposals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.proposalNumber} — {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setShowUploadModal(false)}
              className="px-4 py-2 rounded-lg bg-industrial-100 dark:bg-industrial-800 text-industrial-700 dark:text-industrial-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-bold disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
