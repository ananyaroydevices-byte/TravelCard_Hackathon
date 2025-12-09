import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  userEmail: string;
  tripData: {
    destinations: string[];
    travel_start_date: string;
    travel_end_date: string;
    purpose: string;
  };
  itinerary: {
    flights: Array<{
      from: string;
      to: string;
      date: string;
      airline: string;
      price_per_person: number;
      duration: string;
    }>;
    hotels: Array<{
      city: string;
      name: string;
      check_in_date: string;
      check_out_date: string;
      price_per_night: number;
      nights: number;
      total_price: number;
    }>;
    days: Array<{
      day: number;
      date: string;
      city: string;
      activities: Array<{
        time: string;
        title: string;
        description: string;
        duration: string;
      }>;
    }>;
  };
  costBreakdown: {
    flights_total: number;
    hotels_total: number;
    total: number;
  };
}

function generateEmailHTML(data: EmailRequest): string {
  const { tripData, itinerary, costBreakdown } = data;

  const flightsHTML = itinerary.flights
    .map(
      (flight) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${flight.from} → ${flight.to}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${flight.date}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${flight.airline}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${flight.duration}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${flight.price_per_person}</td>
    </tr>
  `
    )
    .join("");

  const hotelsHTML = itinerary.hotels
    .map(
      (hotel) => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${hotel.city}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${hotel.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${hotel.check_in_date}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${hotel.check_out_date}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${hotel.price_per_night}/night</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">$${hotel.total_price}</td>
    </tr>
  `
    )
    .join("");

  const daysHTML = itinerary.days
    .map(
      (day) => `
    <div style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; padding: 16px;">
      <h3 style="color: #1f2937; margin: 0 0 12px 0;">Day ${day.day} - ${day.city} (${day.date})</h3>
      ${day.activities
        .map(
          (activity) => `
        <div style="margin-bottom: 12px; padding: 12px; background: white; border-radius: 6px;">
          <div style="font-weight: 600; color: #059669; margin-bottom: 4px;">${activity.time} - ${activity.title}</div>
          <div style="color: #6b7280; font-size: 14px; margin-bottom: 4px;">${activity.description}</div>
          <div style="color: #9ca3af; font-size: 12px;">Duration: ${activity.duration}</div>
        </div>
      `
        )
        .join("")}
    </div>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Travel Itinerary</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%); color: white; padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="margin: 0 0 10px 0; font-size: 32px;">Your Travel Itinerary</h1>
    <p style="margin: 0; font-size: 18px; opacity: 0.9;">${tripData.destinations.join(" → ")}</p>
    <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.8;">${tripData.travel_start_date} to ${tripData.travel_end_date}</p>
  </div>

  <div style="background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <div style="margin-bottom: 30px;">
      <h2 style="color: #1f2937; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Trip Overview</h2>
      <p><strong>Purpose:</strong> ${tripData.purpose}</p>
      <p><strong>Total Cost:</strong> $${costBreakdown.total}</p>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="color: #1f2937; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Flights</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Route</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Date</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Airline</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Duration</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${flightsHTML}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="color: #1f2937; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Hotels</h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">City</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Hotel</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Check-in</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Check-out</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Per Night</th>
            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #0d9488;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${hotelsHTML}
        </tbody>
      </table>
    </div>

    <div style="margin-bottom: 30px;">
      <h2 style="color: #1f2937; border-bottom: 2px solid #0d9488; padding-bottom: 10px;">Daily Itinerary</h2>
      ${daysHTML}
    </div>

    <div style="background: #f0fdfa; border: 2px solid #0d9488; border-radius: 8px; padding: 20px; margin-top: 30px;">
      <h3 style="color: #1f2937; margin: 0 0 15px 0;">Cost Breakdown</h3>
      <table style="width: 100%;">
        <tr>
          <td style="padding: 8px 0; color: #4b5563;">Flights:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${costBreakdown.flights_total}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #4b5563;">Hotels:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${costBreakdown.hotels_total}</td>
        </tr>
        <tr style="border-top: 2px solid #0d9488;">
          <td style="padding: 12px 0; color: #1f2937; font-size: 18px; font-weight: 700;">Total:</td>
          <td style="padding: 12px 0; text-align: right; color: #0d9488; font-size: 18px; font-weight: 700;">$${costBreakdown.total}</td>
        </tr>
      </table>
      <p style="margin: 15px 0 0 0; padding-top: 15px; border-top: 1px solid #cbd5e1; color: #6b7280; font-size: 14px;">
        Note: Activities and intra-city travel costs are not included in this cost estimate.
      </p>
    </div>

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
      <p>Have a wonderful trip! 🌍✈️</p>
      <p style="margin-top: 10px;">This itinerary was generated by your AI Travel Planner</p>
    </div>
  </div>
</body>
</html>
  `;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const requestData: EmailRequest = await req.json();

    const emailHTML = generateEmailHTML(requestData);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer re_123456789",
      },
      body: JSON.stringify({
        from: "Travel Planner <onboarding@resend.dev>",
        to: [requestData.userEmail],
        subject: `Your Travel Itinerary: ${requestData.tripData.destinations.join(" → ")}`,
        html: emailHTML,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const result = await resendResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        emailId: result.id,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to send email",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
