import React from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Loader, ArrowLeft, CheckCircle } from 'lucide-react';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/utils/validators';
import { authService } from '@/services/auth.service';

/**
 * ForgotPasswordPage - Request password reset
 */
export default function ForgotPasswordPage(): React.ReactElement {
  const [submitted, setSubmitted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, getValues } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setLoading(true);
    setError(null);

    try {
      await authService.requestPasswordReset(data.email);
      setSubmitted(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send reset email';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Check Your Email
        </h1>

        <p className="text-gray-600 dark:text-gray-400 mb-4">
          We've sent a password reset link to:
        </p>

        <p className="font-medium text-gray-900 dark:text-white mb-6">
          {getValues('email')}
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Click the link in the email to reset your password. The link will expire in 24 hours.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Forgot Password
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              {...register('email')}
              id="email"
              type="email"
              placeholder="you@example.com"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
        >
          {loading && <Loader className="w-5 h-5 animate-spin" />}
          {loading ? 'Sending...' : 'Send Reset Link'}
        </button>

        {/* Back to Login */}
        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link to="/login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </form>
    </div>
  );
}
