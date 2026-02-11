import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface WebhookPayload {
  type: "INSERT";
  table: string;
  record: {
    id: number;
    email: string;
    source: string;
    confirmed: boolean;
  };
}

const brandConfig: Record<string, { name: string; domain: string; color: string; tagline: string; url: string }> = {
  mindbalance: {
    name: "MindBalance",
    domain: "mindbalance.cloud",
    color: "#af916d",
    tagline: "Your Mental Wellness Companion",
    url: "https://mindbalance.cloud",
  },
  mindspace: {
    name: "MindSpace",
    domain: "mindspace.site",
    color: "#2068A8",
    tagline: "Your Mental Wellness Space",
    url: "https://mindspace.site",
  },
};

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();

    if (!payload.record.confirmed) {
      return new Response(JSON.stringify({ message: "Not confirmed, skipping" }), { status: 200 });
    }

    const source = payload.record.source || "mindspace";
    const brand = brandConfig[source] || brandConfig.mindspace;
    const email = payload.record.email;

    const emailHtml = `
    <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #3d3a50; font-size: 28px; margin: 0;">${brand.name}</h1>
        <p style="color: ${brand.color}; font-size: 14px; margin-top: 5px;">${brand.tagline}</p>
      </div>
      
      <div style="background: linear-gradient(135deg, #f8f8fa 0%, #fff 100%); border-radius: 16px; padding: 30px; border: 1px solid #e0e0e8;">
        <h2 style="color: #3d3a50; font-size: 22px; margin-top: 0;">Welcome to Our Community!</h2>
        
        <p style="color: #5a5770; font-size: 16px; line-height: 1.6;">
          Thank you for subscribing to the ${brand.name} newsletter! You'll now receive:
        </p>
        
        <ul style="color: #5a5770; font-size: 15px; line-height: 1.8; padding-left: 20px;">
          <li>Weekly mental wellness tips and strategies</li>
          <li>New articles and resources</li>
          <li>Community updates and stories</li>
          <li>Exclusive content and early access</li>
        </ul>
        
        <p style="color: #5a5770; font-size: 16px; line-height: 1.6;">
          We're committed to supporting your mental health journey with credible, 
          compassionate resources.
        </p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${brand.url}" 
             style="display: inline-block; background: ${brand.color}; color: #fff; padding: 14px 32px; 
                    border-radius: 30px; text-decoration: none; font-weight: 600; font-size: 15px;">
            Visit ${brand.name}
          </a>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e8;">
        <p style="color: #8a8899; font-size: 13px; margin: 0;">
          You received this email because you subscribed to the ${brand.name} newsletter.
        </p>
        <p style="color: #8a8899; font-size: 13px; margin-top: 10px;">
          <a href="${brand.url}" style="color: ${brand.color}; text-decoration: none;">
            ${brand.domain}
          </a>
        </p>
      </div>
    </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${brand.name} <noreply@${brand.domain}>`,
        to: [email],
        subject: `Welcome to ${brand.name} Newsletter!`,
        html: emailHtml,
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.error("Resend error:", resData);
      return new Response(JSON.stringify({ error: resData }), { status: 500 });
    }

    return new Response(JSON.stringify({ message: "Welcome email sent", data: resData }), { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
