// =============================================================================
// WEBHOOK GATEWAY SERVER
// =============================================================================
// A lightweight webhook receiving and processing gateway built with Elysia.js
// Features:
//   - JWT signature validation for secure webhook authentication
//   - In-memory queue with automatic retry mechanism
//   - Real-time monitoring dashboard with Tailwind CSS
//   - RESTful API endpoints for integration
//
// Technology Stack:
//   - Runtime: Node.js (via @elysiajs/node adapter)
//   - Framework: Elysia.js (Bun-first, but Node.js compatible)
//   - Authentication: JWT (jsonwebtoken)
//   - Frontend: Tailwind CSS (CDN)
// =============================================================================

import { Elysia, t } from "elysia"
import { node } from "@elysiajs/node"
import { html } from "@elysiajs/html"
import jwt from "jsonwebtoken"

// =============================================================================
// CONFIGURATION
// =============================================================================
// Secret key for JWT signing and verification
// In production, this should be loaded from environment variables:
//   const SECRET = process.env.JWT_SECRET || 'fallback-secret'
const SECRET = "super-secret-signature"

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Webhook payload structure
 * @property event - Event type identifier (e.g., "user.created", "order.completed")
 * @property data - Arbitrary event data payload
 */
interface WebhookPayload {
  event: string
  data: any
}

/**
 * Queue item wrapper for webhook processing
 * @property payload - The original webhook payload
 * @property retries - Number of processing attempts made
 * @property addedAt - Timestamp when item was added to queue (Unix ms)
 */
interface WebhookQueueItem {
  payload: WebhookPayload
  retries: number
  addedAt: number
}

/**
 * Processed event record for history tracking
 * @property event - Event type that was processed
 * @property status - Processing result ('success' | 'failed')
 * @property timestamp - When the event was processed (Unix ms)
 */
interface ProcessedEvent {
  event: string
  status: "success" | "failed"
  timestamp: number
}

// =============================================================================
// IN-MEMORY DATA STORES
// =============================================================================
// Note: In production, consider using Redis or a proper message queue
// (e.g., RabbitMQ, AWS SQS) for persistence and scalability

/**
 * Webhook processing queue
 * Items are added when webhooks are received and removed after processing
 */
const queue: WebhookQueueItem[] = []

/**
 * History of processed events for monitoring dashboard
 * Maintains a rolling window of recent events (max 20)
 */
const processedEvents: ProcessedEvent[] = []

/**
 * Maximum retry attempts before dropping a failed webhook
 * After MAX_RETRIES failures, the webhook is logged and discarded
 */
const MAX_RETRIES = 3

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Validates the JWT signature from incoming webhook requests
 *
 * Security Flow:
 * 1. Check if signature header exists
 * 2. Verify JWT token against secret key
 * 3. Token must be valid and not expired
 *
 * @param payload - Raw JSON string of request body (used for HMAC in future)
 * @param signature - JWT token from 'x-signature' header
 * @returns boolean - True if signature is valid, false otherwise
 *
 * @example
 * // Valid token generated with same SECRET
 * validateSignature('{"event":"test"}', 'eyJhbGciOiJI...') // true
 *
 * // Invalid or expired token
 * validateSignature('{"event":"test"}', 'invalid-token') // false
 */
const validateSignature = (_payload: string, signature: string): boolean => {
  // Early return if no signature provided
  if (!signature) return false

  try {
    // Verify JWT token using the shared secret
    // This checks: valid format, correct signature, not expired
    jwt.verify(signature, SECRET)
    return true
  } catch {
    // Token is invalid, expired, or malformed
    return false
  }
}

/**
 * Processes all items currently in the webhook queue
 *
 * Processing Logic:
 * 1. Iterate through queue items
 * 2. Attempt to process each webhook
 * 3. On success: remove from queue, add to history
 * 4. On failure: increment retry counter
 * 5. If max retries exceeded: drop item and log failure
 *
 * Note: In production, this would typically:
 * - Forward webhooks to downstream services
 * - Store in database for audit trail
 * - Trigger async workers for heavy processing
 *
 * @sideeffect Modifies queue[] and processedEvents[] arrays
 */
const processQueue = (): void => {
  // Process each item in the queue
  // Using forEach with index for in-place removal
  queue.forEach((item, index) => {
    try {
      // Log processing attempt (replace with actual webhook forwarding logic)
      console.log(`[QUEUE] Processing event: ${item.payload.event}`)

      // Simulate successful processing
      // In production: await forwardToService(item.payload)

      // Record successful processing in history
      processedEvents.unshift({
        event: item.payload.event,
        status: "success",
        timestamp: Date.now(),
      })

      // Maintain history size limit (rolling window)
      // Prevents memory growth in long-running processes
      if (processedEvents.length > 20) {
        processedEvents.pop()
      }

      // Remove processed item from queue
      queue.splice(index, 1)
    } catch (err) {
      // Processing failed - increment retry counter
      item.retries++
      console.error(
        `[QUEUE] Failed to process ${item.payload.event}, attempt ${item.retries}/${MAX_RETRIES}`
      )

      // Check if max retries exceeded
      if (item.retries >= MAX_RETRIES) {
        console.error(
          `[QUEUE] Dropping failed webhook after ${MAX_RETRIES} attempts:`,
          item.payload
        )

        // Record failure in history
        processedEvents.unshift({
          event: item.payload.event,
          status: "failed",
          timestamp: Date.now(),
        })

        // Remove failed item from queue
        queue.splice(index, 1)
      }
      // If retries remaining, item stays in queue for next processing cycle
    }
  })
}

// =============================================================================
// APPLICATION INITIALIZATION
// =============================================================================
// Create Elysia app instance with Node.js adapter
// The adapter allows Elysia (originally Bun-first) to run on Node.js runtime

const app = new Elysia({
  adapter: node(), // Enable Node.js compatibility layer
}).use(html()) // Enable HTML response support for dashboard

// =============================================================================
// DASHBOARD UI ROUTE
// =============================================================================
// Serves the main monitoring dashboard at root path
// Built with Tailwind CSS (CDN) for modern, responsive styling

app.get(
  "/",
  () => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Webhook Gateway</title>
  
  <!-- Tailwind CSS CDN -->
  <!-- In production, consider building Tailwind locally for better performance -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Tailwind Configuration -->
  <!-- Extending default theme with custom dark mode colors -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            dark: {
              50: '#f8fafc',
              100: '#f1f5f9',
              200: '#e2e8f0',
              300: '#cbd5e1',
              400: '#94a3b8',
              500: '#64748b',
              600: '#475569',
              700: '#334155',
              800: '#1e293b',
              900: '#0f172a',
              950: '#020617'
            }
          }
        }
      }
    }
  </script>
  
  <!-- Custom Styles -->
  <!-- Glass morphism effect for modern UI appearance -->
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%);
    }
    .glass {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(10px);
    }
  </style>
</head>
<body class="gradient-bg min-h-screen text-slate-200">
  
  <!-- ===================================================================== -->
  <!-- HEADER SECTION -->
  <!-- ===================================================================== -->
  <header class="border-b border-slate-800">
    <div class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <!-- Branding -->
      <div class="flex items-center gap-3">
        <span class="text-3xl">📬</span>
        <div>
          <h1 class="text-xl font-bold text-white">Webhook Gateway</h1>
          <p class="text-sm text-slate-500">Test & Monitor Interface</p>
        </div>
      </div>
      <!-- Status Indicator -->
      <!-- Shows real-time server status with animated pulse -->
      <div class="flex items-center gap-2">
        <span class="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-sm">
          <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
          Online
        </span>
      </div>
    </div>
  </header>

  <!-- ===================================================================== -->
  <!-- MAIN CONTENT -->
  <!-- ===================================================================== -->
  <main class="max-w-6xl mx-auto px-6 py-8">
    
    <!-- API Endpoint Information Banner -->
    <!-- Quick reference for developers integrating with the API -->
    <div class="mb-8 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
      <div class="flex flex-wrap items-center gap-4 text-sm">
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-indigo-500 text-white rounded font-mono font-bold text-xs">POST</span>
          <code class="text-indigo-300">/webhook</code>
        </div>
        <div class="text-slate-500">|</div>
        <div class="text-slate-400">
          Header: <code class="text-indigo-300 bg-slate-800/50 px-2 py-0.5 rounded">x-signature: &lt;JWT&gt;</code>
        </div>
      </div>
    </div>

    <!-- Two Column Layout: Form (left) + Stats (right) -->
    <div class="grid lg:grid-cols-3 gap-6">
      
      <!-- ================================================================= -->
      <!-- LEFT COLUMN: WEBHOOK TESTING FORM -->
      <!-- ================================================================= -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Send Webhook Form Card -->
        <div class="glass rounded-2xl border border-slate-800 p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>🚀</span> Send Webhook
          </h2>
          
          <!-- Quick Preset Buttons -->
          <!-- Pre-configured event types for rapid testing -->
          <div class="mb-4">
            <label class="block text-sm text-slate-500 mb-2">Quick Presets</label>
            <div class="flex flex-wrap gap-2">
              <button onclick="loadPreset('user.created')" 
                class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                user.created
              </button>
              <button onclick="loadPreset('order.completed')" 
                class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                order.completed
              </button>
              <button onclick="loadPreset('payment.received')" 
                class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                payment.received
              </button>
              <button onclick="loadPreset('subscription.cancelled')" 
                class="px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
                subscription.cancelled
              </button>
            </div>
          </div>

          <!-- Form Input Fields -->
          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <!-- Event Name Input -->
            <div>
              <label class="block text-sm text-slate-500 mb-2">Event Name</label>
              <input type="text" id="eventName" value="user.created"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
            </div>
            <!-- Signature Mode Selector -->
            <!-- Allows testing different authentication scenarios -->
            <div>
              <label class="block text-sm text-slate-500 mb-2">Signature Mode</label>
              <select id="signatureMode"
                class="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all">
                <option value="valid">✓ Valid JWT</option>
                <option value="invalid">✗ Invalid Signature</option>
                <option value="none">○ No Signature</option>
              </select>
            </div>
          </div>

          <!-- JSON Payload Editor -->
          <div class="mb-4">
            <label class="block text-sm text-slate-500 mb-2">Payload (JSON)</label>
            <textarea id="payload" rows="6"
              class="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white font-mono text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
            >{
  "userId": 12345,
  "email": "user@example.com",
  "timestamp": "${new Date().toISOString()}"
}</textarea>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-3">
            <button onclick="sendWebhook()" 
              class="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-indigo-500/25">
              Send Webhook
            </button>
            <button onclick="clearAll()" 
              class="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors">
              Clear
            </button>
          </div>
        </div>

        <!-- Response Display Panel -->
        <!-- Hidden by default, shown after sending webhook -->
        <div id="responsePanel" class="glass rounded-2xl border border-slate-800 p-6 hidden">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-white flex items-center gap-2">
              <span>📥</span> Response
            </h2>
            <!-- HTTP Status Badge (color-coded) -->
            <span id="statusBadge" class="px-3 py-1 rounded-full text-sm font-medium">
              -
            </span>
          </div>
          <!-- JSON Response Body -->
          <pre id="responseBody" class="p-4 bg-slate-900/70 rounded-xl text-sm font-mono overflow-x-auto text-slate-300"></pre>
        </div>
      </div>

      <!-- ================================================================= -->
      <!-- RIGHT COLUMN: MONITORING & STATS -->
      <!-- ================================================================= -->
      <div class="space-y-6">
        
        <!-- Statistics Card -->
        <!-- Real-time queue and processing metrics -->
        <div class="glass rounded-2xl border border-slate-800 p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Stats
          </h2>
          <div class="grid grid-cols-2 gap-4">
            <!-- Queue Counter -->
            <div class="p-4 bg-slate-900/50 rounded-xl text-center">
              <div id="queueCount" class="text-3xl font-bold text-indigo-400">0</div>
              <div class="text-sm text-slate-500">In Queue</div>
            </div>
            <!-- Processed Counter -->
            <div class="p-4 bg-slate-900/50 rounded-xl text-center">
              <div id="processedCount" class="text-3xl font-bold text-emerald-400">0</div>
              <div class="text-sm text-slate-500">Processed</div>
            </div>
          </div>
          <button onclick="refreshStats()" 
            class="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors">
            ↻ Refresh
          </button>
        </div>

        <!-- Recent Events History -->
        <!-- Shows last 10 processed webhooks with status -->
        <div class="glass rounded-2xl border border-slate-800 p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>📋</span> Recent Events
          </h2>
          <div id="eventsList" class="space-y-2 max-h-64 overflow-y-auto">
            <div class="text-slate-500 text-sm text-center py-4">No events yet</div>
          </div>
        </div>

        <!-- cURL Example Card -->
        <!-- Dynamically updated based on current form values -->
        <div class="glass rounded-2xl border border-slate-800 p-6">
          <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>💻</span> cURL Example
            <span class="text-xs text-slate-500 font-normal ml-auto">Live Preview</span>
          </h2>
          <div class="relative">
            <pre id="curlExample" class="p-4 bg-slate-900/70 rounded-xl text-xs font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap break-all">curl -X POST http://localhost:8080/webhook \
          -H "Content-Type: application/json" \
          -H "x-signature: YOUR_JWT_TOKEN" \
          -d '{"event":"user.created","data":{}}'</pre>
            
            <!-- Action Buttons -->
            <div class="absolute top-2 right-2 flex gap-1">
              <!-- Refresh Token Button -->
              <button id="refreshTokenBtn" onclick="refreshToken()" 
                class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Refresh JWT Token">
                🔄
              </button>
              <!-- Copy Button -->
              <button id="copyBtn" onclick="copyCurl()" 
                class="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Copy to Clipboard">
                📋
              </button>
            </div>
          </div>
          
          <!-- Token Info -->
          <div class="mt-3 text-xs text-slate-500">
            💡 Token auto-refreshes every 30 min • Click 🔄 to refresh manually
          </div>
        </div>
      </div>
    </div>
  </main>

  <!-- ===================================================================== -->
  <!-- FOOTER -->
  <!-- ===================================================================== -->
  <footer class="border-t border-slate-800 mt-12">
    <div class="max-w-6xl mx-auto px-6 py-4 text-center text-sm text-slate-600">
      Webhook Gateway • Built with Elysia + Node.js
    </div>
  </footer>

  <!-- ===================================================================== -->
  <!-- JAVASCRIPT: CLIENT-SIDE LOGIC -->
  <!-- ===================================================================== -->
  <script>
    // =========================================================================
    // STATE MANAGEMENT
    // =========================================================================
    
    // Cached JWT token for cURL example
    // Fetched on page load and refreshed periodically
    let cachedToken = 'YOUR_JWT_TOKEN';
    
    // =========================================================================
    // PRESET CONFIGURATIONS
    // =========================================================================
    // Pre-defined webhook payloads for quick testing
    // Each preset simulates a common webhook event type
    const presets = {
      'user.created': { 
        userId: 12345, 
        email: 'user@example.com', 
        plan: 'premium' 
      },
      'order.completed': { 
        orderId: 'ORD-98765', 
        total: 149.99, 
        currency: 'USD', 
        items: ['Product A', 'Product B'] 
      },
      'payment.received': { 
        paymentId: 'PAY-11111', 
        amount: 99.99, 
        currency: 'USD', 
        method: 'card' 
      },
      'subscription.cancelled': { 
        subscriptionId: 'SUB-55555', 
        reason: 'user_request', 
        refundAmount: 25.00 
      }
    };

    // =========================================================================
    // TOKEN MANAGEMENT
    // =========================================================================
    
    /**
     * Fetches a fresh JWT token from the server
     * Updates cachedToken and refreshes cURL example
     */
    async function fetchToken() {
      try {
        const res = await fetch('/generate-test-token');
        const { token } = await res.json();
        cachedToken = token;
        updateCurlExample();
        console.log('[TOKEN] Fresh token fetched');
      } catch (err) {
        console.error('[TOKEN] Failed to fetch:', err);
      }
    }

    // =========================================================================
    // CURL EXAMPLE GENERATOR
    // =========================================================================
    
    /**
     * Updates the cURL example based on current form values
     * Includes real JWT token and formatted JSON payload
     */
    function updateCurlExample() {
      const eventName = document.getElementById('eventName').value;
      let payloadData;
      
      // Try to parse current payload, fallback to empty object
      try {
        payloadData = JSON.parse(document.getElementById('payload').value);
      } catch {
        payloadData = {};
      }
      
      // Construct the webhook body
      const body = { event: eventName, data: payloadData };
      
      // Format JSON for cURL (compact, single line)
      const jsonPayload = JSON.stringify(body);
      
      // Build cURL command with real token
      const curlCommand = \`curl -X POST http://localhost:8080/webhook \\
      -H "Content-Type: application/json" \\
      -H "x-signature: \${cachedToken}" \\
      -d '\${jsonPayload}'\`;
      
      // Update the cURL display
      document.getElementById('curlExample').textContent = curlCommand;
    }

    /**
     * Loads a preset configuration into the form
     * Also updates the cURL example automatically
     * @param {string} name - Preset key from presets object
     */
    function loadPreset(name) {
      document.getElementById('eventName').value = name;
      // Add current timestamp to preset data
      const data = { ...presets[name], timestamp: new Date().toISOString() };
      document.getElementById('payload').value = JSON.stringify(data, null, 2);
      
      // Update cURL example with new preset
      updateCurlExample();
    }

    // =========================================================================
    // WEBHOOK SENDING LOGIC
    // =========================================================================
    
    /**
     * Sends a webhook request to the server
     * Handles JWT token generation based on selected signature mode
     */
    async function sendWebhook() {
      const eventName = document.getElementById('eventName').value;
      const signatureMode = document.getElementById('signatureMode').value;
      let payloadData;

      // Validate JSON payload
      try {
        payloadData = JSON.parse(document.getElementById('payload').value);
      } catch (e) {
        showResponse(400, { error: 'Invalid JSON in payload' }, false);
        return;
      }

      // Construct request body
      const body = { event: eventName, data: payloadData };
      const headers = { 'Content-Type': 'application/json' };

      // Handle signature mode
      if (signatureMode === 'valid') {
        // Use cached token or fetch fresh one
        if (cachedToken === 'YOUR_JWT_TOKEN') {
          await fetchToken();
        }
        headers['x-signature'] = cachedToken;
      } else if (signatureMode === 'invalid') {
        // Use an intentionally invalid token to test 401 response
        headers['x-signature'] = 'invalid-token-xyz';
      }
      // 'none' mode: no x-signature header added

      // Send the webhook request
      try {
        const response = await fetch('/webhook', {
          method: 'POST',
          headers,
          body: JSON.stringify(body)
        });
        const result = await response.json();
        showResponse(response.status, result, response.ok);
        // Refresh stats after successful send
        setTimeout(refreshStats, 500);
      } catch (err) {
        showResponse(500, { error: err.message }, false);
      }
    }

    // =========================================================================
    // UI HELPER FUNCTIONS
    // =========================================================================

    /**
     * Displays the API response in the response panel
     * @param {number} status - HTTP status code
     * @param {object} data - Response body
     * @param {boolean} success - Whether request was successful
     */
    function showResponse(status, data, success) {
      const panel = document.getElementById('responsePanel');
      const badge = document.getElementById('statusBadge');
      const body = document.getElementById('responseBody');

      // Show panel
      panel.classList.remove('hidden');
      
      // Update status badge with color coding
      badge.textContent = status;
      badge.className = 'px-3 py-1 rounded-full text-sm font-medium ' + 
        (success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400');
      
      // Display formatted JSON
      body.textContent = JSON.stringify(data, null, 2);
    }

    /**
     * Clears the response panel and resets form to default
     */
    function clearAll() {
      document.getElementById('responsePanel').classList.add('hidden');
      document.getElementById('eventName').value = 'user.created';
      loadPreset('user.created');
    }

    // =========================================================================
    // STATS & MONITORING
    // =========================================================================

    /**
     * Fetches current queue status from server and updates UI
     * Called on page load and periodically via setInterval
     */
    async function refreshStats() {
      try {
        const res = await fetch('/queue-status');
        const data = await res.json();
        
        // Update counters
        document.getElementById('queueCount').textContent = data.queueLength;
        document.getElementById('processedCount').textContent = data.processedCount;

        // Update recent events list
        const list = document.getElementById('eventsList');
        if (data.recentEvents.length === 0) {
          list.innerHTML = '<div class="text-slate-500 text-sm text-center py-4">No events yet</div>';
        } else {
          // Render event list with status badges
          list.innerHTML = data.recentEvents.map(e => \`
            <div class="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg">
              <span class="text-sm text-slate-300">\${e.event}</span>
              <span class="text-xs px-2 py-0.5 rounded \${e.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}">
                \${e.status}
              </span>
            </div>
          \`).join('');
        }
      } catch (err) {
        console.error('[UI] Failed to refresh stats:', err);
      }
    }

    /**
     * Copies the current cURL example to clipboard
     * Uses modern Clipboard API with visual feedback
     */
    function copyCurl() {
      const curlText = document.getElementById('curlExample').textContent;
      navigator.clipboard.writeText(curlText).then(() => {
        // Visual feedback - change button briefly
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('text-emerald-400');
        setTimeout(() => {
          btn.textContent = originalText;
          btn.classList.remove('text-emerald-400');
        }, 1500);
      });
    }

    /**
     * Refreshes the JWT token and updates cURL example
     * Triggered by the refresh button next to cURL
     */
    async function refreshToken() {
      const btn = document.getElementById('refreshTokenBtn');
      btn.classList.add('animate-spin');
      await fetchToken();
      btn.classList.remove('animate-spin');
    }

    // =========================================================================
    // EVENT LISTENERS FOR LIVE CURL UPDATE
    // =========================================================================
    
    // Update cURL when event name changes
    document.getElementById('eventName').addEventListener('input', updateCurlExample);
    
    // Update cURL when payload changes
    document.getElementById('payload').addEventListener('input', updateCurlExample);

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    
    // Fetch initial token for cURL example
    fetchToken();
    
    // Initial stats load on page ready
    refreshStats();
    
    // Auto-refresh stats every 5 seconds for real-time monitoring
    setInterval(refreshStats, 5000);
    
    // Refresh token every 30 minutes to prevent expiration
    setInterval(fetchToken, 30 * 60 * 1000);
  </script>
</body>
</html>
`
)

// =============================================================================
// API ENDPOINTS
// =============================================================================

/**
 * POST /webhook
 *
 * Main webhook receiver endpoint
 * Accepts incoming webhooks, validates signature, and queues for processing
 *
 * Request Headers:
 *   - Content-Type: application/json (required)
 *   - x-signature: JWT token signed with SECRET (required)
 *
 * Request Body:
 *   - event: string - Event type identifier
 *   - data: any - Event payload data
 *
 * Responses:
 *   - 200: { ok: true, message: string } - Webhook accepted
 *   - 401: { error: string } - Invalid or missing signature
 *   - 400: Validation error (handled by Elysia schema)
 */
app.post(
  "/webhook",
  async ({ body, headers, set }) => {
    // Extract signature from headers
    // Note: In Elysia, headers is a plain object, not Headers API
    const signature = headers["x-signature"] ?? ""

    // Stringify body for signature validation (used in HMAC scenarios)
    const rawBody = JSON.stringify(body ?? {})

    // Validate JWT signature
    if (!validateSignature(rawBody, signature)) {
      set.status = 401
      return { error: "Invalid signature" }
    }

    // Add validated webhook to processing queue
    queue.push({
      payload: body as WebhookPayload,
      retries: 0,
      addedAt: Date.now(),
    })

    // Trigger immediate processing
    // In production, this might be handled by a separate worker process
    processQueue()

    return { ok: true, message: "Webhook received and processed" }
  },
  {
    // Request body schema validation using TypeBox
    // Ensures type safety at runtime
    body: t.Object({
      event: t.String(),
      data: t.Any(),
    }),
  }
)

/**
 * GET /generate-test-token
 *
 * Generates a valid JWT token for testing purposes
 * This endpoint should be disabled or protected in production
 *
 * Response:
 *   - token: string - Valid JWT token (expires in 1 hour)
 */
app.get("/generate-test-token", () => {
  const token = jwt.sign({ test: true, iat: Date.now() }, SECRET, {
    expiresIn: "1h",
  })
  return { token }
})

/**
 * GET /queue-status
 *
 * Returns current queue statistics and recent event history
 * Used by the monitoring dashboard for real-time updates
 *
 * Response:
 *   - queueLength: number - Current items in queue
 *   - processedCount: number - Total processed events in history
 *   - maxRetries: number - Maximum retry attempts configured
 *   - items: array - Current queue items (event + retry count)
 *   - recentEvents: array - Last 10 processed events with status
 */
app.get("/queue-status", () => ({
  queueLength: queue.length,
  processedCount: processedEvents.length,
  maxRetries: MAX_RETRIES,
  items: queue.map((item) => ({
    event: item.payload.event,
    retries: item.retries,
  })),
  recentEvents: processedEvents.slice(0, 10),
}))

/**
 * GET /health
 *
 * Health check endpoint for load balancers and monitoring systems
 * Returns server status, uptime, and current timestamp
 *
 * Response:
 *   - status: 'ok' - Server is healthy
 *   - uptime: number - Server uptime in seconds
 *   - timestamp: string - Current ISO timestamp
 *   - queue: object - Queue statistics
 */
app.get("/health", () => ({
  status: "ok",
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
  queue: {
    length: queue.length,
    processed: processedEvents.length,
  },
}))

// =============================================================================
// SERVER STARTUP
// =============================================================================

// Port configuration with environment variable fallback
const PORT = Number(process.env.PORT) || 8080

// Start the HTTP server
app.listen(PORT, () => {
  console.log("=".repeat(60))
  console.log("  WEBHOOK GATEWAY SERVER")
  console.log("=".repeat(60))
  console.log(`  🚀 Server:     http://localhost:${PORT}`)
  console.log(`  📋 Dashboard:  http://localhost:${PORT}`)
  console.log(`  ❤️  Health:     http://localhost:${PORT}/health`)
  console.log(`  📬 Webhook:    POST http://localhost:${PORT}/webhook`)
  console.log("=".repeat(60))
  console.log("  Runtime: Node.js via @elysiajs/node adapter")
  console.log("  Press Ctrl+C to stop")
  console.log("=".repeat(60))
})
