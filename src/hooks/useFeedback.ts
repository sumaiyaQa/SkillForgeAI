import { useState } from 'react';
import type { AuthUser } from '../types';

// Hook to manage the feedback form: rating, comment, and submission status
export function useFeedback(authUser: AuthUser | null, currentProblem: { id: number } | null) {
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Send feedback to the backend
  const handleSubmitFeedback = async () => {
    if (!authUser || authUser.role !== 'student') return;
    if (!currentProblem) return;
    if (!feedbackRating) {
      setFeedbackMessage('Please provide a rating before submitting.');
      return;
    }

    try {
      const res = await fetch('http://localhost:4000/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authUser.token}`,
        },
        body: JSON.stringify({
          problemId: currentProblem.id,
          rating: feedbackRating,
          comment: feedbackComment,
        }),
      });

      if (!res.ok) throw new Error('Failed to submit feedback');

      // Show success message and clear the form
      setFeedbackMessage('✓ Feedback submitted — thank you!');
      setFeedbackRating(null);
      setFeedbackComment('');
    } catch {
      setFeedbackMessage('Error submitting feedback. Please try again.');
    }

    // Clear the message after 4 seconds so it doesn't stay on screen forever
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  return {
    feedbackRating, setFeedbackRating,
    feedbackComment, setFeedbackComment,
    feedbackMessage,
    handleSubmitFeedback,
  };
}