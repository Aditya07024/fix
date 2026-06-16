import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Wallet, Send, AlertCircle, Loader, CheckCircle } from 'lucide-react';
import { paymentsAPI } from '../services/api';
import { Button } from './Button';
import { Card, CardBody, CardHeader } from './Card';
import { Modal } from './Modal';
import { Input, TextArea } from './Form';

interface EarningsData {
  total_earnings: number;
  total_paid_out: number;
  available_balance: number;
  earnings_breakdown: Array<{
    id: string;
    booking_date: string;
    total_price: number;
    status: string;
    services?: {
      id: string;
      name: string;
    };
    payments?: Array<{
      amount: number;
      payment_status: string;
      created_at: string;
    }>;
  }>;
}

interface Payout {
  id: string;
  amount: number;
  status: string;
  payout_method: string;
  created_at: string;
  upi_id?: string;
  bank_account_number?: string;
}

export default function EarningsDashboard() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutError, setPayoutError] = useState<string | null>(null);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [selectedPayoutMethod, setSelectedPayoutMethod] = useState<'bank' | 'upi'>('upi');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    setLoading(true);
    try {
      const [earningsRes, payoutsRes] = await Promise.all([
        paymentsAPI.getEmployeeEarningsDetail(),
        paymentsAPI.getEmployeePayouts(),
      ]);

      if (earningsRes.data.success) {
        setEarnings(earningsRes.data.data);
      }

      if (payoutsRes.data.success) {
        setPayouts(payoutsRes.data.data || []);
      }

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch earnings data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayoutSubmit = async (formData: Record<string, any>) => {
    setPayoutLoading(true);
    setPayoutError(null);

    try {
      const payoutData = {
        amount: parseFloat(formData.amount),
        payout_method: selectedPayoutMethod,
        ...(selectedPayoutMethod === 'upi' && { upi_id: formData.upi_id }),
        ...(selectedPayoutMethod === 'bank' && {
          bank_account_number: formData.bank_account_number,
          bank_ifsc_code: formData.bank_ifsc_code,
        }),
      };

      const response = await paymentsAPI.createPayoutRequest(payoutData);

      if (response.data.success) {
        setPayoutSuccess(true);
        setShowPayoutModal(false);
        setTimeout(() => {
          fetchEarningsData();
          setPayoutSuccess(false);
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Failed to create payout request');
      }
    } catch (err: any) {
      setPayoutError(err.message || 'Failed to create payout request');
    } finally {
      setPayoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const earningsData = earnings || {
    total_earnings: 0,
    total_paid_out: 0,
    available_balance: 0,
    earnings_breakdown: [],
  };

  return (
    <div className="space-y-6">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 dark:text-red-400" size={20} />
          <p className="text-red-700 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Success Alert */}
      {payoutSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex gap-3">
          <CheckCircle className="text-green-600 dark:text-green-400" size={20} />
          <p className="text-green-700 dark:text-green-200">Payout request created successfully!</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                ₹{earningsData.total_earnings.toFixed(2)}
              </p>
            </div>
            <DollarSign className="text-blue-600 dark:text-blue-400" size={40} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Available Balance</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                ₹{earningsData.available_balance.toFixed(2)}
              </p>
            </div>
            <Wallet className="text-green-600 dark:text-green-400" size={40} />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Paid Out</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                ₹{earningsData.total_paid_out.toFixed(2)}
              </p>
            </div>
            <TrendingUp className="text-purple-600 dark:text-purple-400" size={40} />
          </div>
        </Card>
      </div>

      {/* Request Payout Button */}
      {earningsData.available_balance > 0 && (
        <Button
          onClick={() => setShowPayoutModal(true)}
          className="w-full flex items-center justify-center gap-2"
        >
          <Send size={18} />
          Request Payout
        </Button>
      )}

      {/* Recent Payouts */}
      {payouts.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Payouts</h3>
          <div className="space-y-3">
            {payouts.slice(0, 5).map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    ₹{payout.amount.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {payout.payout_method.toUpperCase()} • {new Date(payout.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    payout.status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : payout.status === 'processing'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
                  }`}
                >
                  {payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Earnings Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings by Booking</h3>
        {earningsData.earnings_breakdown.length > 0 ? (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {earningsData.earnings_breakdown.map((booking) => (
              <div key={booking.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {booking.services?.name || 'Service'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 dark:text-green-400">
                      ₹{booking.total_price.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {booking.payments?.[0]?.payment_status === 'completed' ? 'Paid' : 'Pending'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Booking Status: {booking.status}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400">No earnings yet</p>
        )}
      </Card>

      {/* Payout Modal */}
      <PayoutModal
        isOpen={showPayoutModal}
        onClose={() => {
          setShowPayoutModal(false);
          setPayoutError(null);
        }}
        maxAmount={earningsData.available_balance}
        onSubmit={handlePayoutSubmit}
        loading={payoutLoading}
        error={payoutError}
        selectedMethod={selectedPayoutMethod}
        onMethodChange={setSelectedPayoutMethod}
      />
    </div>
  );
}

interface PayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: number;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  loading: boolean;
  error: string | null;
  selectedMethod: 'bank' | 'upi';
  onMethodChange: (method: 'bank' | 'upi') => void;
}

function PayoutModal({
  isOpen,
  onClose,
  maxAmount,
  onSubmit,
  loading,
  error,
  selectedMethod,
  onMethodChange,
}: PayoutModalProps) {
  const [amount, setAmount] = useState('');
  const [upiId, setUpiId] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > maxAmount) {
      alert(`Amount cannot exceed ₹${maxAmount.toFixed(2)}`);
      return;
    }

    const formData = {
      amount,
      ...(selectedMethod === 'upi' && { upi_id: upiId }),
      ...(selectedMethod === 'bank' && {
        bank_account_number: bankAccount,
        bank_ifsc_code: bankIfsc,
      }),
    };

    await onSubmit(formData);

    // Reset form
    if (!error) {
      setAmount('');
      setUpiId('');
      setBankAccount('');
      setBankIfsc('');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Request Payout</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Amount (Max: ₹{maxAmount.toFixed(2)})
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              disabled={loading}
              required
            />
          </div>

          {/* Payout Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payout Method
            </label>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 flex-1 p-3 border-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor: selectedMethod === 'upi' ? '#3b82f6' : '#d1d5db',
                  backgroundColor: selectedMethod === 'upi' ? '#eff6ff' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  value="upi"
                  checked={selectedMethod === 'upi'}
                  onChange={(e) => onMethodChange(e.target.value as 'upi')}
                  disabled={loading}
                />
                <span className="text-sm font-medium">UPI</span>
              </label>
              <label className="flex items-center gap-2 flex-1 p-3 border-2 rounded-lg cursor-pointer transition-colors"
                style={{
                  borderColor: selectedMethod === 'bank' ? '#3b82f6' : '#d1d5db',
                  backgroundColor: selectedMethod === 'bank' ? '#eff6ff' : 'transparent',
                }}
              >
                <input
                  type="radio"
                  value="bank"
                  checked={selectedMethod === 'bank'}
                  onChange={(e) => onMethodChange(e.target.value as 'bank')}
                  disabled={loading}
                />
                <span className="text-sm font-medium">Bank</span>
              </label>
            </div>
          </div>

          {/* UPI ID */}
          {selectedMethod === 'upi' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="example@upi"
                disabled={loading}
                required={selectedMethod === 'upi'}
              />
            </div>
          )}

          {/* Bank Details */}
          {selectedMethod === 'bank' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your account number"
                  disabled={loading}
                  required={selectedMethod === 'bank'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Bank IFSC code"
                  disabled={loading}
                  required={selectedMethod === 'bank'}
                />
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Request Payout'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
