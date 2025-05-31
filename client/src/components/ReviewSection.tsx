import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Star, MessageSquare, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ReviewSectionProps {
  recipeId: number;
}

interface Review {
  id: number;
  rating: number;
  comment?: string;
  createdAt: string;
  user: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  };
}

export default function ReviewSection({ recipeId }: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [newReview, setNewReview] = useState({
    rating: 0,
    comment: ""
  });
  const [hoverRating, setHoverRating] = useState(0);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["/api/recipes", recipeId, "reviews"],
    queryFn: async () => {
      const response = await fetch(`/api/recipes/${recipeId}/reviews`);
      if (!response.ok) throw new Error("Failed to fetch reviews");
      return response.json();
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData: { rating: number; comment?: string }) => {
      await apiRequest("POST", `/api/recipes/${recipeId}/reviews`, reviewData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes", recipeId] });
      setNewReview({ rating: 0, comment: "" });
      toast({
        title: "Review submitted!",
        description: "Thank you for sharing your feedback.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave a review.",
      });
      return;
    }

    if (newReview.rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select a rating before submitting.",
        variant: "destructive",
      });
      return;
    }

    createReviewMutation.mutate({
      rating: newReview.rating,
      comment: newReview.comment.trim() || undefined
    });
  };

  const renderStars = (rating: number, interactive = false, size = "w-5 h-5") => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type={interactive ? "button" : undefined}
        disabled={!interactive}
        className={interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}
        onClick={interactive ? () => setNewReview(prev => ({ ...prev, rating: i + 1 })) : undefined}
        onMouseEnter={interactive ? () => setHoverRating(i + 1) : undefined}
        onMouseLeave={interactive ? () => setHoverRating(0) : undefined}
      >
        <Star
          className={`${size} ${
            i < (interactive ? (hoverRating || newReview.rating) : rating)
              ? "text-yellow-400 fill-current" 
              : "text-gray-300"
          }`}
        />
      </button>
    ));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} week${Math.floor(diffInDays / 7) > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-6 rounded mb-4"></div>
          <div className="bg-gray-200 h-32 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-6 h-6 text-vegan-primary" />
        <h2 className="text-xl font-semibold text-gray-900">
          Reviews ({reviews.length})
        </h2>
      </div>

      {/* Add Review Form */}
      {isAuthenticated ? (
        <Card className="bg-neutral-50">
          <CardHeader>
            <CardTitle className="text-lg">Share Your Experience</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Rating *
                </label>
                <div className="flex items-center gap-1">
                  {renderStars(newReview.rating, true, "w-6 h-6")}
                  {newReview.rating > 0 && (
                    <span className="ml-2 text-sm text-gray-600">
                      {newReview.rating} star{newReview.rating !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Your Review (Optional)
                </label>
                <Textarea
                  id="comment"
                  value={newReview.comment}
                  onChange={(e) => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                  placeholder="Share your thoughts about this recipe..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              <Button 
                type="submit"
                className="bg-vegan-primary text-white hover:bg-vegan-secondary"
                disabled={createReviewMutation.isPending || newReview.rating === 0}
              >
                {createReviewMutation.isPending ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-neutral-50">
          <CardContent className="p-6 text-center">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <h3 className="font-medium text-gray-900 mb-2">Share Your Experience</h3>
            <p className="text-gray-600 mb-4">Sign in to leave a review and help others discover great recipes.</p>
            <Button 
              onClick={() => window.location.href = "/api/login"}
              className="bg-vegan-primary text-white hover:bg-vegan-secondary"
            >
              Sign In to Review
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review: Review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={review.user.profileImageUrl} alt={review.user.firstName || "User"} />
                      <AvatarFallback>
                        {review.user.firstName?.[0] || review.user.email?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900">
                        {review.user.firstName 
                          ? `${review.user.firstName} ${review.user.lastName || ""}` 
                          : review.user.email
                        }
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex">
                          {renderStars(review.rating, false, "w-4 h-4")}
                        </div>
                        <span className="text-sm text-gray-500">
                          {review.rating} star{review.rating !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(review.createdAt)}
                  </span>
                </div>
                
                {review.comment && (
                  <p className="text-gray-700 leading-relaxed">
                    {review.comment}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <CardContent>
            <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
            <p className="text-gray-600">
              Be the first to share your experience with this recipe!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
