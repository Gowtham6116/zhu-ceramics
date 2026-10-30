const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function clean(value, maxLength = 2000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  if (origin) {
    try {
      if (new URL(origin).origin !== requestUrl.origin) {
        return json({ success: false, message: "Request origin not allowed." }, 403);
      }
    } catch {
      return json({ success: false, message: "Invalid request origin." }, 403);
    }
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 12000) {
    return json({ success: false, message: "The enquiry is too large." }, 413);
  }

  let incoming;
  try {
    incoming = await request.json();
  } catch {
    return json({ success: false, message: "Please submit a valid enquiry." }, 400);
  }

  // Quietly discard automated submissions caught by the hidden honeypot.
  if (clean(incoming.website, 200)) {
    return json({ success: true, stored: false, spam: true });
  }

  const payload = {
    name: clean(incoming.name, 120),
    mobile: clean(incoming.mobile, 40),
    email: clean(incoming.email, 254).toLowerCase(),
    productInterest: clean(incoming.productInterest, 300),
    tiles: Array.isArray(incoming.tiles) ? incoming.tiles.slice(0, 20).map(item => clean(item, 120)).filter(Boolean) : [],
    space: clean(incoming.space, 80),
    message: clean(incoming.message, 3000)
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email);
  const validPhone = /^[+\d][\d\s()\-]{7,}$/.test(payload.mobile);
  if (!payload.name || !validEmail || !validPhone) {
    return json({ success: false, message: "Please check your name, email address and mobile number." }, 400);
  }

  const scriptUrl = clean(env.GOOGLE_APPS_SCRIPT_URL, 500);
  const sharedSecret = clean(env.APPS_SCRIPT_SHARED_SECRET, 500);
  if (!scriptUrl || !sharedSecret) {
    return json({ success: false, message: "The enquiry service has not been configured yet. Please contact the showroom directly." }, 503);
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(scriptUrl);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.includes("/macros/s/")) {
      throw new Error("Invalid Apps Script URL");
    }
  } catch {
    return json({ success: false, message: "The enquiry service configuration is invalid." }, 500);
  }

  try {
    const upstream = await fetch(scriptUrl, {
      method: "POST",
      headers: { "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...payload, secret: sharedSecret }),
      redirect: "follow"
    });

    const responseText = await upstream.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error("Apps Script returned a non-JSON response", upstream.status, responseText.slice(0, 500));
      return json({ success: false, message: "The enquiry service could not process your request. Please try again shortly." }, 502);
    }

    if (!upstream.ok || !result.success) {
      console.error("Apps Script rejected the enquiry", upstream.status, result.message || "Unknown error");
      return json({ success: false, message: result.message || "We could not save your enquiry. Please try again." }, 502);
    }

    return json({
      success: true,
      stored: result.stored === true,
      adminEmailSent: result.adminEmailSent === true,
      customerEmailSent: result.customerEmailSent === true,
      whatsappSent: result.whatsappSent === true,
      whatsappStatus: result.whatsappStatus || "not_configured"
    });
  } catch (error) {
    console.error("Enquiry forwarding failed", error);
    return json({ success: false, message: "We could not reach the enquiry service. Please try again shortly." }, 502);
  }
}
