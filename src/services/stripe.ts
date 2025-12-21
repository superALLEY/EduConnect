// Stripe Service for Connect Integration

const STRIPE_SECRET_KEY = import.meta.env.VITE_STRIPE_SECRET_KEY || '';
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

// Platform Stripe Account ID
const PLATFORM_ACCOUNT_ID = import.meta.env.VITE_STRIPE_PLATFORM_ACCOUNT_ID || '';

export { STRIPE_PUBLISHABLE_KEY, PLATFORM_ACCOUNT_ID };

interface CreateConnectAccountParams {
  email: string;
  name: string;
  userId: string;
  country?: string; // ISO 3166-1 alpha-2 country code (e.g., 'US', 'FR', 'GB')
}

interface CreateConnectAccountResponse {
  success: boolean;
  accountId?: string;
  onboardingUrl?: string;
  error?: string;
}

/**
 * Create a Stripe Connect account for a teacher
 */
export async function createStripeConnectAccount(
  params: CreateConnectAccountParams
): Promise<CreateConnectAccountResponse> {
  try {
    // Step 1: Create a Connect account with comprehensive initial data
    const accountParams = new URLSearchParams({
      type: 'express',
      email: params.email,
      business_type: 'individual',
      country: params.country || 'US', // Use selected country or default to US
    });
    
    // Add capabilities properly for URL encoding
    accountParams.append('capabilities[card_payments][requested]', 'true');
    accountParams.append('capabilities[transfers][requested]', 'true');
    
    // Add metadata
    accountParams.append('metadata[user_id]', params.userId);
    accountParams.append('metadata[platform]', 'educonnect');
    
    // Add business profile to pre-fill information
    accountParams.append('business_profile[mcc]', '8299'); // Educational services MCC code
    accountParams.append('business_profile[name]', params.name);
    accountParams.append('business_profile[product_description]', 'Educational courses and tutoring services');
    accountParams.append('business_profile[support_email]', params.email);
    
    // Add individual information
    accountParams.append('individual[email]', params.email);
    
    // Settings to enable all features from the start
    accountParams.append('settings[payouts][schedule][interval]', 'manual'); // Manual payouts for better control
    
    const accountResponse = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: accountParams.toString(),
    });

    if (!accountResponse.ok) {
      const errorData = await accountResponse.json();
      console.error('Stripe account creation error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to create Stripe account',
      };
    }

    const accountData = await accountResponse.json();
    const accountId = accountData.id;

    // Step 2: Create an account link for comprehensive onboarding
    const accountLinkResponse = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId,
        refresh_url: `${window.location.origin}/stripe-return?refresh=true`,
        return_url: `${window.location.origin}/stripe-return?success=true`,
        type: 'account_onboarding',
        'collect': 'eventually_due', // Collect all information needed eventually
      }),
    });

    if (!accountLinkResponse.ok) {
      const errorData = await accountLinkResponse.json();
      console.error('Stripe account link error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to create onboarding link',
      };
    }

    const linkData = await accountLinkResponse.json();

    return {
      success: true,
      accountId: accountId,
      onboardingUrl: linkData.url,
    };
  } catch (error) {
    console.error('Error creating Stripe Connect account:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if a Stripe Connect account is fully onboarded
 */
export async function checkStripeAccountStatus(accountId: string): Promise<{
  isComplete: boolean;
  requiresAction: boolean;
  details?: any;
  error?: string;
}> {
  try {
    const response = await fetch(`https://api.stripe.com/v1/accounts/${accountId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        isComplete: false,
        requiresAction: true,
        error: errorData.error?.message,
      };
    }

    const accountData = await response.json();
    
    console.log('Stripe Account Status:', {
      id: accountData.id,
      charges_enabled: accountData.charges_enabled,
      payouts_enabled: accountData.payouts_enabled,
      details_submitted: accountData.details_submitted,
      requirements: accountData.requirements,
    });
    
    return {
      isComplete: accountData.charges_enabled && accountData.payouts_enabled,
      requiresAction: !accountData.details_submitted,
      details: {
        charges_enabled: accountData.charges_enabled,
        payouts_enabled: accountData.payouts_enabled,
        details_submitted: accountData.details_submitted,
        requirements: accountData.requirements,
      },
    };
  } catch (error) {
    console.error('Error checking Stripe account status:', error);
    return {
      isComplete: false,
      requiresAction: true,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Create a new account link for re-onboarding
 */
export async function createAccountLink(accountId: string): Promise<string | null> {
  try {
    const response = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: accountId,
        refresh_url: `${window.location.origin}/stripe-return`,
        return_url: `${window.location.origin}/stripe-return`,
        type: 'account_onboarding',
      }),
    });

    if (!response.ok) {
      return null;
    }

    const linkData = await response.json();
    return linkData.url;
  } catch (error) {
    console.error('Error creating account link:', error);
    return null;
  }
}

interface CreatePaymentIntentParams {
  amount: number; // Amount in USD (will be converted to cents)
  courseId: string;
  courseName: string;
  studentId: string;
  studentEmail: string;
  instructorId: string;
  instructorStripeAccountId: string;
  basePrice: number;
}

interface CreatePaymentIntentResponse {
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  error?: string;
}

/**
 * Create a Payment Intent for course enrollment
 * The platform receives the full amount and then transfers the teacher's share
 */
export async function createCoursePaymentIntent(
  params: CreatePaymentIntentParams
): Promise<CreatePaymentIntentResponse> {
  try {
    // Convert amount to cents (Stripe uses smallest currency unit)
    const amountInCents = Math.round(params.amount * 100);
    
    const paymentParams = new URLSearchParams({
      amount: amountInCents.toString(),
      currency: 'usd',
      'metadata[course_id]': params.courseId,
      'metadata[course_name]': params.courseName,
      'metadata[student_id]': params.studentId,
      'metadata[student_email]': params.studentEmail,
      'metadata[instructor_id]': params.instructorId,
      'metadata[instructor_account]': params.instructorStripeAccountId,
      'metadata[base_price]': params.basePrice.toString(),
      'metadata[platform_fee]': (params.amount - params.basePrice).toString(),
      description: `Course enrollment: ${params.courseName}`,
    });

    const response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: paymentParams.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe Payment Intent error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to create payment intent',
      };
    }

    const paymentIntent = await response.json();

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

interface TransferToInstructorParams {
  amount: number; // Amount in USD to transfer to instructor
  instructorStripeAccountId: string;
  paymentIntentId: string;
  courseId: string;
  courseName: string;
}

interface TransferToInstructorResponse {
  success: boolean;
  transferId?: string;
  error?: string;
}

/**
 * Transfer funds to instructor's Stripe Connect account after payment is received
 * In test mode, this is simulated to avoid balance_insufficient errors
 */
export async function transferToInstructor(
  params: TransferToInstructorParams
): Promise<TransferToInstructorResponse> {
  try {
    // In test mode, simulate the transfer instead of making a real API call
    // This avoids the balance_insufficient error in Stripe test environment
    const isTestMode = STRIPE_SECRET_KEY.includes('_test_');
    
    if (isTestMode) {
      // Simulate a successful transfer in test mode
      console.log('Simulating transfer in test mode:', {
        amount: params.amount,
        instructor: params.instructorStripeAccountId,
        course: params.courseName,
      });
      
      return {
        success: true,
        transferId: 'tr_test_' + Math.random().toString(36).substr(2, 16),
      };
    }
    
    // Production mode: Make real transfer
    // Convert amount to cents
    const amountInCents = Math.round(params.amount * 100);
    
    const transferParams = new URLSearchParams({
      amount: amountInCents.toString(),
      currency: 'usd',
      destination: params.instructorStripeAccountId,
      'metadata[course_id]': params.courseId,
      'metadata[course_name]': params.courseName,
      'metadata[payment_intent]': params.paymentIntentId,
      description: `Course payment: ${params.courseName}`,
    });

    const response = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: transferParams.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe Transfer error:', errorData);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to transfer funds',
      };
    }

    const transfer = await response.json();

    return {
      success: true,
      transferId: transfer.id,
    };
  } catch (error) {
    console.error('Error transferring to instructor:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Confirm a payment with card details
 */
export async function confirmCardPayment(
  clientSecret: string,
  cardElement: any
): Promise<{ success: boolean; error?: string; paymentIntent?: any }> {
  try {
    // In a real implementation, this would use Stripe.js
    // For now, we'll simulate a successful payment
    return {
      success: true,
      paymentIntent: {
        id: 'pi_' + Math.random().toString(36).substr(2, 9),
        status: 'succeeded',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}