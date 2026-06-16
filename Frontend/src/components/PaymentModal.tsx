import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import {
  bookingsAPI,
  paymentsAPI,
  type ApiResponse,
  type BookingApiItem,
  type BookingCreatePayload,
} from '../services/api';
import { useAuth } from '../stores/authStore';
import { Button } from './Button';
import { Modal } from './Modal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  bookingId?: string;
  bookingPayload?: BookingCreatePayload;
  bookingDetails?: {
    service_name?: string;
    booking_date?: string;
    employee_name?: string;
  };
  onPaymentSuccess?: (result?: { bookingId?: string; booking?: BookingApiItem }) => void;
  onPaymentFailed?: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = async () => {
  if (window.Razorpay) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Failed to load Razorpay checkout')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Razorpay checkout'));
    document.body.appendChild(script);
  });
};

export default function PaymentModal({
  isOpen,
  onClose,
  amount,
  bookingId,
  bookingPayload,
  bookingDetails,
  onPaymentSuccess,
  onPaymentFailed,
}: PaymentModalProps) {
  const SERVICE_PAYMENT_METHOD_FIELD_KEY = 'payment_method';
  const user = useAuth((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'upi' | 'cash'>('upi');
  
  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : Number(amount);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(false);
      setLoading(false);
      setPaymentStatus('idle');
      setSelectedPaymentMode('upi');
    }
  }, [isOpen]);

  const bookingPayloadWithPaymentMode = (
    mode: 'upi' | 'cash'
  ): BookingCreatePayload | undefined => {
    if (!bookingPayload) {
      return undefined;
    }

    return {
      ...bookingPayload,
      customer_choices: {
        ...(bookingPayload.customer_choices || {}),
        [SERVICE_PAYMENT_METHOD_FIELD_KEY]: mode,
      },
    };
  };

  const handlePayment = async (mode: 'upi' | 'cash' = 'upi') => {
    if (loading || paymentStatus === 'processing') return;

    setLoading(true);
    setError(null);
    setPaymentStatus('processing');
    setSelectedPaymentMode(mode);

    try {
      if (mode === 'cash' && bookingPayload) {
        const cashBookingPayload = bookingPayloadWithPaymentMode('cash');
        const bookingResponse = (await bookingsAPI.create(
          cashBookingPayload!
        )) as unknown as ApiResponse<BookingApiItem>;

        if (!bookingResponse.success || !bookingResponse.data) {
          throw new Error(bookingResponse.error || 'Failed to create booking');
        }

        setPaymentStatus('success');
        setSuccess(true);
        onPaymentSuccess?.({
          bookingId: bookingResponse.data.id,
          booking: bookingResponse.data,
        });

        setTimeout(() => {
          onClose();
          setPaymentStatus('idle');
          setSuccess(false);
        }, 2000);

        return;
      }

      let response: ApiResponse<{
        order_id: string;
        razorpay_key: string;
        amount: number;
        currency: string;
      }>;

      if (bookingPayload) {
        response = (await paymentsAPI.initiatePreBookingPayment(
          numericAmount,
          bookingPayloadWithPaymentMode('upi')!
        )) as unknown as ApiResponse<{
          order_id: string;
          razorpay_key: string;
          amount: number;
          currency: string;
        }>;
      } else if (bookingId) {
        response = (await paymentsAPI.initiatePayment(
          bookingId,
          numericAmount
        )) as unknown as ApiResponse<{
          order_id: string;
          razorpay_key: string;
          amount: number;
          currency: string;
        }>;
      } else {
        throw new Error('Missing booking information for payment');
      }

      if (!response.success || !response.data) {
        throw new Error(response.error || 'Failed to initiate payment');
      }

      const { order_id, razorpay_key, amount: orderAmount, currency } = response.data;

      await loadRazorpayScript();
      initiateRazorpayPayment(order_id, razorpay_key, orderAmount, currency);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Payment initiation failed';
      setError(errorMessage);
      setPaymentStatus('failed');
      onPaymentFailed?.();
      setLoading(false);
    }
  };

  const initiateRazorpayPayment = (
    orderId: string,
    razorpayKey: string,
    orderAmount: number,
    currency: string
  ) => {
    const options = {
      key: razorpayKey,
      amount: orderAmount,
      currency: currency || 'INR',
      name: 'TotalFix27x7 Services',
      description: bookingDetails?.service_name || 'Service Payment',
      order_id: orderId,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
        contact: user?.phone || '',
      },
      theme: {
        color: '#3b82f6',
      },
      handler: async (response: any) => {
        try {
          let completedBooking: BookingApiItem | undefined;
          let paymentVerified = false;

          if (bookingPayload) {
            const createBookingResponse = (await paymentsAPI.verifyPaymentAndCreateBooking(
              response.razorpay_order_id || orderId,
              response.razorpay_payment_id,
              response.razorpay_signature,
              bookingPayloadWithPaymentMode('upi')!
            )) as unknown as ApiResponse<{
              booking: BookingApiItem;
            }>;

            if (!createBookingResponse.success || !createBookingResponse.data?.booking) {
              throw new Error(createBookingResponse.error || 'Booking creation after payment failed');
            }

            completedBooking = createBookingResponse.data.booking;
            paymentVerified = true;
          } else {
            const verifyResponse = (await paymentsAPI.verifyPayment(
              response.razorpay_order_id || orderId,
              response.razorpay_payment_id,
              response.razorpay_signature
            )) as unknown as ApiResponse<unknown>;

            if (!verifyResponse.success) {
              throw new Error(verifyResponse.error || 'Payment verification failed');
            }

            paymentVerified = true;
          }

          if (paymentVerified) {
            setPaymentStatus('success');
            setSuccess(true);
            onPaymentSuccess?.({
              bookingId: completedBooking?.id || bookingId,
              booking: completedBooking,
            });
            
            // Close modal after 2 seconds
            setTimeout(() => {
              onClose();
              setPaymentStatus('idle');
              setSuccess(false);
            }, 2000);
          }
        } catch (err: any) {
          const errorMessage =
            err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Payment verification failed';
          setError(errorMessage);
          setPaymentStatus('failed');
          onPaymentFailed?.();
        } finally {
          setLoading(false);
        }
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          setPaymentStatus('idle');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', (response: any) => {
      const message =
        response?.error?.description ||
        response?.error?.reason ||
        'Payment failed. Please try again.';
      setError(message);
      setPaymentStatus('failed');
      setLoading(false);
      onPaymentFailed?.();
    });
    razorpay.open();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment</h2>
          <button
            onClick={onClose}
            disabled={loading || paymentStatus === 'processing'}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Success State */}
        {paymentStatus === 'success' && success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">Payment Successful!</h3>
                <p className="text-sm text-green-700 dark:text-green-200">Your payment has been processed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && paymentStatus !== 'success' && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Payment Failed</h3>
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {bookingDetails && !success && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-6 space-y-2">
            {bookingDetails.service_name && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Service</span>
                <span className="font-medium text-gray-900 dark:text-white">{bookingDetails.service_name}</span>
              </div>
            )}
            {bookingDetails.booking_date && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Date</span>
                <span className="font-medium text-gray-900 dark:text-white">{new Date(bookingDetails.booking_date).toLocaleDateString()}</span>
              </div>
            )}
            {bookingDetails.employee_name && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Employee</span>
                <span className="font-medium text-gray-900 dark:text-white">{bookingDetails.employee_name}</span>
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="border-t border-b border-gray-200 dark:border-gray-700 py-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-lg text-gray-600 dark:text-gray-400">Total Amount</span>
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">₹{numericAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {selectedPaymentMode === 'cash'
              ? 'Cash payment will skip Razorpay and the booking will be created directly.'
              : 'Secure payment powered by Razorpay. Your payment information is encrypted and safe.'}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading || paymentStatus === 'processing'}
            className="flex-1"
          >
            Cancel
          </Button>
          {bookingPayload ? (
            <>
              <Button
                variant="secondary"
                onClick={() => void handlePayment('cash')}
                disabled={loading || paymentStatus === 'processing' || success}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {paymentStatus === 'processing' || loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay with Cash'
                )}
              </Button>
              <Button
                onClick={() => void handlePayment('upi')}
                disabled={loading || paymentStatus === 'processing' || success}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {paymentStatus === 'processing' || loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Pay with UPI'
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => void handlePayment('upi')}
              disabled={loading || paymentStatus === 'processing' || success}
              className="flex-1 flex items-center justify-center gap-2"
            >
              {paymentStatus === 'processing' || loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                `Pay ₹${numericAmount.toFixed(2)}`
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
