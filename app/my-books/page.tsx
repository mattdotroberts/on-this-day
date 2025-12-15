'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, authEnabled } from '@/lib/auth-client';
import { BookOpen, Loader2, Trash2, Globe, Lock, Eye, ArrowLeft, RefreshCw, CheckCircle, CreditCard, Printer, Download, Package } from 'lucide-react';
import type { ClientBook } from '@/lib/types';

interface GenerationJob {
  id: string;
  bookId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentMonth: number;
  errorMessage: string | null;
  createdAt: string;
}

interface JobWithBook {
  job: GenerationJob;
  book: {
    id: string;
    name: string;
    birthYear: number;
    coverImageUrl: string | null;
  } | null;
}

interface Purchase {
  id: string;
  productType: 'digital' | 'printedDigital';
  paymentStatus: 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
  bookPrefs: {
    name: string;
    birthYear: string;
  } | null;
  book: {
    id: string;
    name: string;
    birthYear: number;
    coverImageUrl: string | null;
    generationStatus: string;
  } | null;
  job: {
    id: string;
    status: string;
    progress: number;
    currentMonth: number;
  } | null;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MyBooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const [books, setBooks] = useState<ClientBook[]>([]);
  const [jobs, setJobs] = useState<JobWithBook[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Check for success message from payment redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessMessage(true);
      // Clear URL params
      router.replace('/my-books');
      // Auto-hide after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  }, [searchParams, router]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authEnabled) {
      router.push('/');
      return;
    }
  }, [router]);

  // Fetch books, jobs, and purchases
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [booksRes, jobsRes, purchasesRes] = await Promise.all([
        fetch(`/api/books?userId=${user.id}`),
        fetch('/api/jobs'),
        fetch('/api/purchases'),
      ]);

      if (booksRes.ok) {
        const booksData = await booksRes.json();
        setBooks(booksData);
      }

      if (jobsRes.ok) {
        const jobsData = await jobsRes.json();
        setJobs(jobsData);
      }

      if (purchasesRes.ok) {
        const purchasesData = await purchasesRes.json();
        setPurchases(purchasesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Process next month for a job
  const processJob = async (jobId: string) => {
    if (processingJobId) return;
    setProcessingJobId(jobId);

    try {
      const res = await fetch('/api/jobs/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (data.status === 'completed') {
        // Refresh data to show completed book
        await fetchData();
      } else {
        // Update local job state
        setJobs(prev =>
          prev.map(j =>
            j.job.id === jobId
              ? {
                  ...j,
                  job: {
                    ...j.job,
                    status: data.status,
                    progress: data.progress,
                    currentMonth: data.currentMonth,
                  },
                }
              : j
          )
        );
      }
    } catch (error) {
      console.error('Failed to process job:', error);
    } finally {
      setProcessingJobId(null);
    }
  };

  // Poll for active jobs
  useEffect(() => {
    const activeJobs = jobs.filter(
      j => j.job.status === 'pending' || j.job.status === 'processing'
    );
    if (activeJobs.length === 0) return;

    // Process each active job
    const processNextJob = async () => {
      for (const { job } of activeJobs) {
        if (!processingJobId) {
          await processJob(job.id);
        }
      }
    };

    const interval = setInterval(processNextJob, 2000); // Poll every 2 seconds
    processNextJob(); // Start immediately

    return () => clearInterval(interval);
  }, [jobs, processingJobId]);

  // Delete a book
  const handleDelete = async (bookId: string) => {
    if (!confirm('Are you sure you want to delete this book?')) return;

    try {
      await fetch(`/api/books/${bookId}`, { method: 'DELETE' });
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setJobs(prev => prev.filter(j => j.book?.id !== bookId));
    } catch (error) {
      console.error('Failed to delete book:', error);
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (bookId: string, isPublic: boolean) => {
    try {
      await fetch(`/api/books/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      setBooks(prev =>
        prev.map(b => (b.id === bookId ? { ...b, isPublic: !isPublic } : b))
      );
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
    }
  };

  // View a book
  const handleViewBook = (bookId: string) => {
    router.push(`/?book=${bookId}`);
  };

  if (!authEnabled || !user) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Separate generating and completed books
  const generatingJobs = jobs.filter(
    j => j.job.status === 'pending' || j.job.status === 'processing'
  );
  const failedJobs = jobs.filter(j => j.job.status === 'failed');
  const completedBooks = books.filter(b => b.generationStatus !== 'generating');

  // Purchases awaiting book creation or generating
  const activePurchases = purchases.filter(p =>
    p.paymentStatus === 'succeeded' && (!p.book || p.book.generationStatus !== 'complete')
  );

  // Purchases with print orders
  const printOrders = purchases.filter(p =>
    p.paymentStatus === 'succeeded' && p.productType === 'printedDigital'
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-20">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-50 border border-green-200 rounded-xl px-6 py-4 shadow-lg flex items-center gap-3 animate-in slide-in-from-top">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Payment successful!</p>
            <p className="text-sm text-green-600">Your book is being generated.</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="ml-4 text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="font-cinzel text-2xl text-slate-900">My Books</h1>
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-5 h-5 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          </div>
        ) : (
          <>
            {/* Generating Section */}
            {generatingJobs.length > 0 && (
              <section className="mb-12">
                <h2 className="font-cinzel text-xl text-slate-900 mb-6 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  In Progress
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatingJobs.map(({ job, book }) => (
                    <GeneratingBookCard
                      key={job.id}
                      job={job}
                      bookName={book?.name || 'Your Book'}
                      birthYear={book?.birthYear || 0}
                      isProcessing={processingJobId === job.id}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Failed Section */}
            {failedJobs.length > 0 && (
              <section className="mb-12">
                <h2 className="font-cinzel text-xl text-red-600 mb-6">Failed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {failedJobs.map(({ job, book }) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl shadow-lg border border-red-200 overflow-hidden"
                    >
                      <div className="p-6">
                        <h3 className="font-cinzel text-lg text-slate-900 mb-2">
                          {book?.name || 'Unknown Book'}
                        </h3>
                        <p className="text-sm text-red-600 mb-4">{job.errorMessage}</p>
                        <button
                          onClick={() => book && handleDelete(book.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Print Orders Section */}
            {printOrders.length > 0 && (
              <section className="mb-12">
                <h2 className="font-cinzel text-xl text-slate-900 mb-6 flex items-center gap-2">
                  <Package className="w-5 h-5 text-amber-600" />
                  Print Orders
                </h2>
                <div className="space-y-4">
                  {printOrders.map((purchase) => (
                    <div
                      key={purchase.id}
                      className="bg-white rounded-xl shadow-lg border border-slate-200 p-6"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-amber-100 rounded-lg">
                          <Printer className="w-6 h-6 text-amber-700" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-cinzel text-lg text-slate-900">
                            {purchase.book?.name || purchase.bookPrefs?.name || 'Your Book'}
                          </h3>
                          <p className="text-sm text-slate-500 mb-3">
                            Printed + Digital Edition • ${(purchase.amountCents / 100).toFixed(2)}
                          </p>

                          {/* Status Timeline */}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" /> Paid
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className={`flex items-center gap-1 ${purchase.book?.generationStatus === 'complete' ? 'text-green-600' : 'text-amber-600'}`}>
                              {purchase.book?.generationStatus === 'complete' ? (
                                <><CheckCircle className="w-4 h-4" /> Book Ready</>
                              ) : (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                              )}
                            </span>
                            <span className="text-slate-300">→</span>
                            <span className="flex items-center gap-1 text-slate-400">
                              <Package className="w-4 h-4" /> Shipping Soon
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            {new Date(purchase.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completed Books */}
            <section>
              <h2 className="font-cinzel text-xl text-slate-900 mb-6">
                Your Collection
                {completedBooks.length > 0 && (
                  <span className="text-slate-400 font-normal ml-2">({completedBooks.length})</span>
                )}
              </h2>

              {completedBooks.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-6">No books yet. Create your first one!</p>
                  <button
                    onClick={() => router.push('/')}
                    className="px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    Create a Book
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {completedBooks.map(book => (
                    <BookCard
                      key={book.id}
                      book={book}
                      onView={() => handleViewBook(book.id)}
                      onDelete={() => handleDelete(book.id)}
                      onToggleVisibility={() => handleToggleVisibility(book.id, book.isPublic || false)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

// Generating Book Card Component
function GeneratingBookCard({
  job,
  bookName,
  birthYear,
  isProcessing,
}: {
  job: GenerationJob;
  bookName: string;
  birthYear: number;
  isProcessing: boolean;
}) {
  const currentMonthName = MONTH_NAMES[job.currentMonth] || 'Starting';

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-amber-100">
      {/* Placeholder cover */}
      <div className="aspect-[3/4] bg-gradient-to-br from-amber-50 to-slate-100 flex flex-col items-center justify-center relative">
        <div className={isProcessing ? 'animate-pulse' : ''}>
          <BookOpen className="w-16 h-16 text-amber-300 mb-4" />
        </div>
        <p className="text-sm text-slate-500">
          {isProcessing ? 'Generating...' : 'Waiting...'}
        </p>

        {/* Progress overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-4">
          <div className="w-full bg-slate-600 h-2 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            />
          </div>
          <p className="text-xs text-white text-center">
            {job.progress}% - {currentMonthName}
          </p>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-cinzel text-lg text-slate-900 truncate">{bookName}</h3>
        <p className="text-sm text-slate-500">The {birthYear} Edition</p>
      </div>
    </div>
  );
}

// Book Card Component
function BookCard({
  book,
  onView,
  onDelete,
  onToggleVisibility,
}: {
  book: ClientBook;
  onView: () => void;
  onDelete: () => void;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="group bg-white rounded-xl shadow-lg overflow-hidden border border-slate-200 hover:shadow-xl transition-shadow">
      {/* Cover */}
      <div
        className="aspect-[3/4] bg-slate-100 cursor-pointer relative overflow-hidden"
        onClick={onView}
      >
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={`Cover for ${book.prefs.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Eye className="w-8 h-8 text-white" />
        </div>

        {/* Visibility badge */}
        <div className="absolute top-2 right-2">
          {book.isPublic ? (
            <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Globe className="w-3 h-3" /> Public
            </span>
          ) : (
            <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Lock className="w-3 h-3" /> Private
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-cinzel text-lg text-slate-900 truncate mb-1">{book.prefs.name}</h3>
        <p className="text-sm text-slate-500 mb-3">The {book.prefs.birthYear} Edition</p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleVisibility}
            className="flex-1 text-xs px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Make {book.isPublic ? 'Private' : 'Public'}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
