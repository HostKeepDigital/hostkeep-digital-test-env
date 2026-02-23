import { base44 } from "@/api/base44Client";

// Risk event point values
const RISK_POINTS = {
  id_not_verified: 20,
  bank_name_mismatch: 25,
  duplicate_listing: 30,
  first_booking_cancellation: 10,
  guest_dispute: 20,
  chargeback: 40,
  multiple_accounts_same_ip: 25
};

// Calculate risk level from score
export function calculateRiskLevel(score) {
  if (score < 30) return "low";
  if (score < 60) return "medium";
  return "high";
}

// Add a risk event and update score
export async function addRiskEvent(userId, eventType, description = "") {
  const points = RISK_POINTS[eventType] || 0;
  
  // Create risk event
  await base44.entities.RiskEvents.create({
    user_id: userId,
    event_type: eventType,
    points_added: points,
    description
  });

  // Get or create risk score
  const existingScores = await base44.entities.RiskScores.filter({ user_id: userId });
  let riskScore;

  if (existingScores.length > 0) {
    const current = existingScores[0];
    const newScore = current.score + points;
    const newLevel = calculateRiskLevel(newScore);

    riskScore = await base44.entities.RiskScores.update(current.id, {
      score: newScore,
      risk_level: newLevel,
      last_updated: new Date().toISOString()
    });
  } else {
    riskScore = await base44.entities.RiskScores.create({
      user_id: userId,
      score: points,
      risk_level: calculateRiskLevel(points),
      last_updated: new Date().toISOString()
    });
  }

  // Auto-suspend if score >= 100
  if (riskScore.score >= 100) {
    await base44.auth.updateMe({ account_status: "suspended" });
  } else if (riskScore.risk_level === "high") {
    await base44.auth.updateMe({ account_status: "pending_review" });
  } else if (riskScore.risk_level === "medium") {
    // Flag for admin review (handled in admin dashboard)
  }

  return riskScore;
}

// Get user risk score
export async function getUserRiskScore(userId) {
  const scores = await base44.entities.RiskScores.filter({ user_id: userId });
  return scores[0] || null;
}

// Get user risk events
export async function getUserRiskEvents(userId) {
  return await base44.entities.RiskEvents.filter({ user_id: userId }, '-created_date');
}

// Check if user is verified
export async function isUserVerified(userId) {
  const docs = await base44.entities.VerificationDocuments.filter({ user_id: userId });
  const hasGovernmentId = docs.some(d => d.document_type === "government_id" && d.verification_status === "approved");
  
  return hasGovernmentId;
}

// Get trust badges for user
export async function getUserTrustBadges(userId, userType = "host") {
  const badges = [];
  
  const isVerified = await isUserVerified(userId);
  const riskScore = await getUserRiskScore(userId);
  
  if (userType === "host") {
    const bookings = await base44.entities.Booking.filter({ host_id: userId, booking_status: "completed" });
    const successfulBookings = bookings.length;
    
    if (isVerified && successfulBookings >= 3 && (!riskScore || riskScore.risk_level === "low")) {
      badges.push({
        name: "Verified Host",
        icon: "shield-check",
        color: "blue"
      });
    }
  } else if (userType === "cleaner") {
    const jobs = await base44.entities.CleaningJob.filter({ cleaner_user_id: userId, status: "completed" });
    const completedJobs = jobs.length;
    
    // Get reviews
    const reviews = await base44.entities.CleanerReview.filter({ cleaner_id: userId });
    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
      : 0;
    
    if (completedJobs >= 5 && avgRating >= 4.5 && (!riskScore || riskScore.risk_level === "low")) {
      badges.push({
        name: "Top Cleaner",
        icon: "star",
        color: "gold"
      });
    }
  }
  
  return badges;
}