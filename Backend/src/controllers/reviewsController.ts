import { Request, Response } from "express";
import { supabase } from "../db.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { ApiResponse, Review } from "../types.js";

export const reviewsController = {
  async createReview(req: Request, res: Response) {
    const userId = req.user?.id;
    const { booking_id, service_id, employee_id, rating, comment } = req.body;

    // Verify booking exists and belongs to user
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .eq("user_id", userId)
      .single();

    if (bookingError || !booking) {
      throw new NotFoundError("Booking not found");
    }

    if (booking.status !== "completed") {
      throw new ValidationError("Can only review completed bookings");
    }

    // Check if review already exists
    const { data: existingReview } = await supabase
      .from("reviews")
      .select("id")
      .eq("booking_id", booking_id)
      .single();

    if (existingReview) {
      throw new ValidationError("Review already exists for this booking");
    }

    // Create review
    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        booking_id,
        user_id: userId,
        service_id,
        employee_id: employee_id || null,
        rating,
        comment,
      })
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    // Update service rating
    const { data: serviceReviews, error: serviceReviewsError } = await supabase
      .from("reviews")
      .select("rating")
      .eq("service_id", service_id)
      .is("employee_id", null);

    if (!serviceReviewsError && serviceReviews) {
      const avgRating =
        serviceReviews.reduce((sum, r) => sum + r.rating, 0) /
        serviceReviews.length;

      await supabase
        .from("services")
        .update({
          rating: parseFloat(avgRating.toFixed(1)),
          total_reviews: serviceReviews.length,
        })
        .eq("id", service_id);
    }

    // Update employee rating if employee_id is provided
    if (employee_id) {
      const { data: employeeReviews, error: employeeReviewsError } =
        await supabase
          .from("reviews")
          .select("rating")
          .eq("employee_id", employee_id);

      if (!employeeReviewsError && employeeReviews) {
        const avgRating =
          employeeReviews.reduce((sum, r) => sum + r.rating, 0) /
          employeeReviews.length;

        await supabase
          .from("employees")
          .update({
            rating: parseFloat(avgRating.toFixed(1)),
          })
          .eq("id", employee_id);
      }
    }

    const response: ApiResponse<Review> = {
      success: true,
      data: review,
      message: "Review created successfully",
    };

    res.status(201).json(response);
  },

  async getServiceReviews(req: Request, res: Response) {
    const { service_id } = req.params;

    const { data: reviews, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("service_id", service_id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<Review[]> = {
      success: true,
      data: reviews || [],
    };

    res.status(200).json(response);
  },

  async updateReview(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;
    const { rating, comment } = req.body;

    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !review) {
      throw new NotFoundError("Review not found");
    }

    if (review.user_id !== userId) {
      throw new ValidationError("You can only update your own reviews");
    }

    const { data: updatedReview, error } = await supabase
      .from("reviews")
      .update({ rating, comment })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<Review> = {
      success: true,
      data: updatedReview,
      message: "Review updated successfully",
    };

    res.status(200).json(response);
  },

  async deleteReview(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: review, error: fetchError } = await supabase
      .from("reviews")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !review) {
      throw new NotFoundError("Review not found");
    }

    if (review.user_id !== userId) {
      throw new ValidationError("You can only delete your own reviews");
    }

    const { error } = await supabase.from("reviews").delete().eq("id", id);

    if (error) {
      throw new ValidationError(error.message);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: "Review deleted successfully",
    };

    res.status(200).json(response);
  },
};
