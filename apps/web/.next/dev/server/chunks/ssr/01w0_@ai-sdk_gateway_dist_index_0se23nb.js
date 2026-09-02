module.exports = [
"[project]/node_modules/.bun/@ai-sdk+gateway@4.0.72+ab3ed8e9421bfd7b/node_modules/@ai-sdk/gateway/dist/index.js [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GATEWAY_AUTH_SUBPROTOCOL_PREFIX",
    ()=>GATEWAY_AUTH_SUBPROTOCOL_PREFIX,
    "GATEWAY_REALTIME_SUBPROTOCOL",
    ()=>GATEWAY_REALTIME_SUBPROTOCOL,
    "GATEWAY_TEAM_SUBPROTOCOL_PREFIX",
    ()=>GATEWAY_TEAM_SUBPROTOCOL_PREFIX,
    "GATEWAY_TRANSCRIPTION_SUBPROTOCOL",
    ()=>GATEWAY_TRANSCRIPTION_SUBPROTOCOL,
    "GatewayAuthenticationError",
    ()=>GatewayAuthenticationError,
    "GatewayError",
    ()=>GatewayError,
    "GatewayFailedDependencyError",
    ()=>GatewayFailedDependencyError,
    "GatewayForbiddenError",
    ()=>GatewayForbiddenError,
    "GatewayInternalServerError",
    ()=>GatewayInternalServerError,
    "GatewayInvalidRequestError",
    ()=>GatewayInvalidRequestError,
    "GatewayModelNotFoundError",
    ()=>GatewayModelNotFoundError,
    "GatewayNotFoundError",
    ()=>GatewayNotFoundError,
    "GatewayRateLimitError",
    ()=>GatewayRateLimitError,
    "GatewayResponseError",
    ()=>GatewayResponseError,
    "VERSION",
    ()=>VERSION,
    "createGateway",
    ()=>createGateway,
    "createGatewayProvider",
    ()=>createGateway,
    "gateway",
    ()=>gateway,
    "getGatewayRealtimeAuthToken",
    ()=>getGatewayRealtimeAuthToken,
    "getGatewayRealtimeProtocols",
    ()=>getGatewayRealtimeProtocols,
    "getGatewayRealtimeTeamIdOrSlug",
    ()=>getGatewayRealtimeTeamIdOrSlug,
    "getGatewayTranscriptionProtocols",
    ()=>getGatewayTranscriptionProtocols
]);
// src/gateway-provider.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+provider-utils@5.0.36+ab3ed8e9421bfd7b/node_modules/@ai-sdk/provider-utils/dist/index.js [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@ai-sdk+provider@4.0.10/node_modules/@ai-sdk/provider/dist/index.js [app-ssr] (ecmascript)");
// src/zod.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/zod@4.5.4/node_modules/zod/v4/classic/schemas.js [app-ssr] (ecmascript)");
// src/gateway-language-model-batch.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@workflow+serde@4.1.0/node_modules/@workflow/serde/dist/index.js [app-ssr] (ecmascript)");
// src/vercel-environment.ts
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$vercel$2b$oidc$40$3$2e$2$2e$0$2f$node_modules$2f40$vercel$2f$oidc$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/.bun/@vercel+oidc@3.2.0/node_modules/@vercel/oidc/dist/index.js [app-ssr] (ecmascript)");
// src/gateway-realtime-auth.ts
var GATEWAY_REALTIME_SUBPROTOCOL = "ai-gateway-realtime.v1";
var GATEWAY_TRANSCRIPTION_SUBPROTOCOL = "ai-gateway-transcription.v1";
var GATEWAY_AUTH_SUBPROTOCOL_PREFIX = "ai-gateway-auth.";
var GATEWAY_TEAM_SUBPROTOCOL_PREFIX = "ai-gateway-team.";
function getGatewayRealtimeProtocols(token, options) {
    return buildGatewayProtocols(GATEWAY_REALTIME_SUBPROTOCOL, token, options);
}
function getGatewayTranscriptionProtocols(token, options) {
    return buildGatewayProtocols(GATEWAY_TRANSCRIPTION_SUBPROTOCOL, token, options);
}
function buildGatewayProtocols(marker12, token, options) {
    const protocols = [
        marker12,
        `${GATEWAY_AUTH_SUBPROTOCOL_PREFIX}${token}`
    ];
    if (options == null ? void 0 : options.teamIdOrSlug) {
        protocols.push(`${GATEWAY_TEAM_SUBPROTOCOL_PREFIX}${encodeSubprotocolValue(options.teamIdOrSlug)}`);
    }
    return protocols;
}
function getGatewayRealtimeAuthToken(secWebSocketProtocol) {
    var _a12;
    return ((_a12 = findProtocol(secWebSocketProtocol, GATEWAY_AUTH_SUBPROTOCOL_PREFIX)) == null ? void 0 : _a12.slice(GATEWAY_AUTH_SUBPROTOCOL_PREFIX.length)) || void 0;
}
function getGatewayRealtimeTeamIdOrSlug(secWebSocketProtocol) {
    var _a12;
    const encoded = (_a12 = findProtocol(secWebSocketProtocol, GATEWAY_TEAM_SUBPROTOCOL_PREFIX)) == null ? void 0 : _a12.slice(GATEWAY_TEAM_SUBPROTOCOL_PREFIX.length);
    if (!encoded) return void 0;
    try {
        return decodeSubprotocolValue(encoded) || void 0;
    } catch (e) {
        return void 0;
    }
}
function findProtocol(secWebSocketProtocol, prefix) {
    return secWebSocketProtocol == null ? void 0 : secWebSocketProtocol.split(",").map((protocol)=>protocol.trim()).find((protocol)=>protocol.startsWith(prefix));
}
function encodeSubprotocolValue(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = "";
    for (const byte of bytes){
        binary += String.fromCharCode(byte);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}
function decodeSubprotocolValue(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - base64.length % 4) % 4);
    const binary = atob(`${base64}${padding}`);
    const bytes = Uint8Array.from(binary, (char)=>char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
}
;
;
var z = {
    any: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["any"],
    array: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["array"],
    boolean: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["boolean"],
    discriminatedUnion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["discriminatedUnion"],
    enum: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["enum"],
    literal: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["literal"],
    number: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["number"],
    object: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["object"],
    record: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["record"],
    string: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["string"],
    union: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["union"],
    unknown: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f$zod$40$4$2e$5$2e$4$2f$node_modules$2f$zod$2f$v4$2f$classic$2f$schemas$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["unknown"]
};
;
// src/errors/gateway-error.ts
var marker = "vercel.ai.gateway.error";
var symbol = Symbol.for(marker);
var _a, _b;
var GatewayError = class _GatewayError extends (_b = Error, _a = symbol, _b) {
    constructor({ message, statusCode = 500, cause, generationId, isRetryable = statusCode != null && (statusCode === 408 || // request timeout
    statusCode === 409 || // conflict
    statusCode === 429 || // too many requests
    statusCode >= 500) }){
        super(generationId ? `${message} [${generationId}]` : message);
        this[_a] = true;
        this.statusCode = statusCode;
        this.cause = cause;
        this.generationId = generationId;
        this.isRetryable = isRetryable;
    }
    /**
   * Checks if the given error is a Gateway Error.
   * @param {unknown} error - The error to check.
   * @returns {boolean} True if the error is a Gateway Error, false otherwise.
   */ static isInstance(error) {
        return _GatewayError.hasMarker(error);
    }
    static hasMarker(error) {
        return typeof error === "object" && error !== null && symbol in error && error[symbol] === true;
    }
};
// src/errors/gateway-authentication-error.ts
var name = "GatewayAuthenticationError";
var marker2 = `vercel.ai.gateway.error.${name}`;
var symbol2 = Symbol.for(marker2);
var _a2, _b2;
var GatewayAuthenticationError = class _GatewayAuthenticationError extends (_b2 = GatewayError, _a2 = symbol2, _b2) {
    constructor({ message = "Authentication failed", statusCode = 401, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a2] = true;
        // used in isInstance
        this.name = name;
        this.type = "authentication_error";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol2 in error;
    }
    /**
   * Creates a contextual error message when authentication fails
   */ static createContextualError({ apiKeyProvided, oidcTokenProvided, statusCode = 401, cause, generationId }) {
        let contextualMessage;
        if (apiKeyProvided) {
            contextualMessage = `AI Gateway authentication failed: Invalid API key or token.

Create a new API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys

Provide an API key or Vercel access token via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.`;
        } else if (oidcTokenProvided) {
            contextualMessage = `AI Gateway authentication failed: Invalid OIDC token.

Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.

Alternatively, use an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
or pass a Vercel access token via the 'apiKey' option.`;
        } else {
            contextualMessage = `AI Gateway authentication failed: No authentication provided.

Option 1 - API key:
Create an API key: https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%2Fapi-keys
Provide via 'apiKey' option or 'AI_GATEWAY_API_KEY' environment variable.

Option 2 - Vercel access token:
Pass a Vercel personal access token or Vercel app access token via the 'apiKey' option.

Option 3 - OIDC token:
Run 'npx vercel link' to link your project, then 'vc env pull' to fetch the token.`;
        }
        return new _GatewayAuthenticationError({
            message: contextualMessage,
            statusCode,
            cause,
            generationId
        });
    }
};
// src/errors/gateway-invalid-request-error.ts
var name2 = "GatewayInvalidRequestError";
var marker3 = `vercel.ai.gateway.error.${name2}`;
var symbol3 = Symbol.for(marker3);
var _a3, _b3;
var GatewayInvalidRequestError = class extends (_b3 = GatewayError, _a3 = symbol3, _b3) {
    constructor({ message = "Invalid request", statusCode = 400, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a3] = true;
        // used in isInstance
        this.name = name2;
        this.type = "invalid_request_error";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol3 in error;
    }
};
// src/errors/gateway-rate-limit-error.ts
var name3 = "GatewayRateLimitError";
var marker4 = `vercel.ai.gateway.error.${name3}`;
var symbol4 = Symbol.for(marker4);
var _a4, _b4;
var GatewayRateLimitError = class extends (_b4 = GatewayError, _a4 = symbol4, _b4) {
    constructor({ message = "Rate limit exceeded", statusCode = 429, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a4] = true;
        // used in isInstance
        this.name = name3;
        this.type = "rate_limit_exceeded";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol4 in error;
    }
};
;
var name4 = "GatewayModelNotFoundError";
var marker5 = `vercel.ai.gateway.error.${name4}`;
var symbol5 = Symbol.for(marker5);
var modelNotFoundParamSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        modelId: z.string()
    })));
var _a5, _b5;
var GatewayModelNotFoundError = class extends (_b5 = GatewayError, _a5 = symbol5, _b5) {
    constructor({ message = "Model not found", statusCode = 404, modelId, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a5] = true;
        // used in isInstance
        this.name = name4;
        this.type = "model_not_found";
        this.modelId = modelId;
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol5 in error;
    }
};
// src/errors/gateway-not-found-error.ts
var name5 = "GatewayNotFoundError";
var marker6 = `vercel.ai.gateway.error.${name5}`;
var symbol6 = Symbol.for(marker6);
var _a6, _b6;
var GatewayNotFoundError = class extends (_b6 = GatewayError, _a6 = symbol6, _b6) {
    constructor({ message = "Resource not found", statusCode = 404, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a6] = true;
        // used in isInstance
        this.name = name5;
        this.type = "not_found";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol6 in error;
    }
};
// src/errors/gateway-internal-server-error.ts
var name6 = "GatewayInternalServerError";
var marker7 = `vercel.ai.gateway.error.${name6}`;
var symbol7 = Symbol.for(marker7);
var _a7, _b7;
var GatewayInternalServerError = class extends (_b7 = GatewayError, _a7 = symbol7, _b7) {
    constructor({ message = "Internal server error", statusCode = 500, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a7] = true;
        // used in isInstance
        this.name = name6;
        this.type = "internal_server_error";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol7 in error;
    }
};
// src/errors/gateway-failed-dependency-error.ts
var name7 = "GatewayFailedDependencyError";
var marker8 = `vercel.ai.gateway.error.${name7}`;
var symbol8 = Symbol.for(marker8);
var _a8, _b8;
var GatewayFailedDependencyError = class extends (_b8 = GatewayError, _a8 = symbol8, _b8) {
    constructor({ message = "Failed dependency", statusCode = 424, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a8] = true;
        // used in isInstance
        this.name = name7;
        this.type = "failed_dependency";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol8 in error;
    }
};
;
var name8 = "GatewayForbiddenError";
var marker9 = `vercel.ai.gateway.error.${name8}`;
var symbol9 = Symbol.for(marker9);
var forbiddenParamSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        ruleId: z.string()
    })));
var _a9, _b9;
var GatewayForbiddenError = class extends (_b9 = GatewayError, _a9 = symbol9, _b9) {
    constructor({ message = "Forbidden", statusCode = 403, cause, generationId, ruleId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a9] = true;
        // used in isInstance
        this.name = name8;
        this.type = "forbidden";
        this.ruleId = ruleId;
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol9 in error;
    }
};
// src/errors/gateway-response-error.ts
var name9 = "GatewayResponseError";
var marker10 = `vercel.ai.gateway.error.${name9}`;
var symbol10 = Symbol.for(marker10);
var _a10, _b10;
var GatewayResponseError = class extends (_b10 = GatewayError, _a10 = symbol10, _b10) {
    constructor({ message = "Invalid response from Gateway", statusCode = 502, response, validationError, cause, generationId, isRetryable } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId,
            isRetryable
        });
        this[_a10] = true;
        // used in isInstance
        this.name = name9;
        this.type = "response_error";
        this.response = response;
        this.validationError = validationError;
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol10 in error;
    }
};
;
async function createGatewayErrorFromResponse({ response, statusCode, defaultMessage = "Gateway request failed", cause, authMethod, isRetryable }) {
    var _a12;
    const parseResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["safeValidateTypes"])({
        value: response,
        schema: gatewayErrorResponseSchema
    });
    if (!parseResult.success) {
        const rawGenerationId = typeof response === "object" && response !== null && "generationId" in response ? response.generationId : void 0;
        return new GatewayResponseError({
            message: `Invalid error response format: ${defaultMessage}`,
            statusCode,
            response,
            validationError: parseResult.error,
            cause,
            generationId: rawGenerationId,
            isRetryable
        });
    }
    const validatedResponse = parseResult.value;
    const errorType = validatedResponse.error.type;
    const message = validatedResponse.error.message;
    const generationId = (_a12 = validatedResponse.generationId) != null ? _a12 : void 0;
    switch(errorType){
        case "authentication_error":
            return GatewayAuthenticationError.createContextualError({
                apiKeyProvided: authMethod === "api-key",
                oidcTokenProvided: authMethod === "oidc",
                statusCode,
                cause,
                generationId
            });
        case "invalid_request_error":
            return new GatewayInvalidRequestError({
                message,
                statusCode,
                cause,
                generationId
            });
        case "rate_limit_exceeded":
            return new GatewayRateLimitError({
                message,
                statusCode,
                cause,
                generationId
            });
        case "model_not_found":
            {
                const modelResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["safeValidateTypes"])({
                    value: validatedResponse.error.param,
                    schema: modelNotFoundParamSchema
                });
                return new GatewayModelNotFoundError({
                    message,
                    statusCode,
                    modelId: modelResult.success ? modelResult.value.modelId : void 0,
                    cause,
                    generationId
                });
            }
        case "not_found":
            return new GatewayNotFoundError({
                message,
                statusCode,
                cause,
                generationId
            });
        case "internal_server_error":
            return new GatewayInternalServerError({
                message,
                statusCode,
                cause,
                generationId
            });
        case "failed_dependency":
            return new GatewayFailedDependencyError({
                message,
                statusCode,
                cause,
                generationId
            });
        case "forbidden":
            {
                const ruleResult = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["safeValidateTypes"])({
                    value: validatedResponse.error.param,
                    schema: forbiddenParamSchema
                });
                return new GatewayForbiddenError({
                    message,
                    statusCode,
                    cause,
                    generationId,
                    ruleId: ruleResult.success ? ruleResult.value.ruleId : void 0
                });
            }
        default:
            return new GatewayInternalServerError({
                message,
                statusCode,
                cause,
                generationId
            });
    }
}
var gatewayErrorResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        error: z.object({
            message: z.string(),
            type: z.string().nullish(),
            param: z.unknown().nullish(),
            code: z.union([
                z.string(),
                z.number()
            ]).nullish()
        }),
        generationId: z.string().nullish()
    })));
;
function extractApiCallResponse(error) {
    if (error.data !== void 0) {
        return error.data;
    }
    if (error.responseBody != null) {
        try {
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["secureJsonParse"])(error.responseBody);
        } catch (e) {
            return error.responseBody;
        }
    }
    return {};
}
// src/errors/gateway-timeout-error.ts
var name10 = "GatewayTimeoutError";
var marker11 = `vercel.ai.gateway.error.${name10}`;
var symbol11 = Symbol.for(marker11);
var _a11, _b11;
var GatewayTimeoutError = class _GatewayTimeoutError extends (_b11 = GatewayError, _a11 = symbol11, _b11) {
    constructor({ message = "Request timed out", statusCode = 408, cause, generationId } = {}){
        super({
            message,
            statusCode,
            cause,
            generationId
        });
        this[_a11] = true;
        // used in isInstance
        this.name = name10;
        this.type = "timeout_error";
    }
    static isInstance(error) {
        return GatewayError.hasMarker(error) && symbol11 in error;
    }
    /**
   * Creates a helpful timeout error message with troubleshooting guidance
   */ static createTimeoutError({ originalMessage, statusCode = 408, cause, generationId }) {
        const message = `Gateway request timed out: ${originalMessage}

    This is a client-side timeout. To resolve this, increase your timeout configuration: https://vercel.com/docs/ai-gateway/capabilities/video-generation#extending-timeouts-for-node.js`;
        return new _GatewayTimeoutError({
            message,
            statusCode,
            cause,
            generationId
        });
    }
};
// src/errors/as-gateway-error.ts
function isTimeoutError(error) {
    if (!(error instanceof Error)) {
        return false;
    }
    const errorCode = error.code;
    if (typeof errorCode === "string") {
        const undiciTimeoutCodes = [
            "UND_ERR_HEADERS_TIMEOUT",
            "UND_ERR_BODY_TIMEOUT",
            "UND_ERR_CONNECT_TIMEOUT"
        ];
        return undiciTimeoutCodes.includes(errorCode);
    }
    return false;
}
async function asGatewayError(error, authMethod) {
    var _a12;
    if (GatewayError.isInstance(error)) {
        return error;
    }
    if (isTimeoutError(error)) {
        return GatewayTimeoutError.createTimeoutError({
            originalMessage: error instanceof Error ? error.message : "Unknown error",
            cause: error
        });
    }
    if (__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["APICallError"].isInstance(error)) {
        if (error.cause && isTimeoutError(error.cause)) {
            return GatewayTimeoutError.createTimeoutError({
                originalMessage: error.message,
                cause: error
            });
        }
        return await createGatewayErrorFromResponse({
            response: extractApiCallResponse(error),
            statusCode: (_a12 = error.statusCode) != null ? _a12 : 500,
            defaultMessage: "Gateway request failed",
            cause: error,
            authMethod,
            isRetryable: error.isRetryable && (error.statusCode == null || error.statusCode < 400) ? true : void 0
        });
    }
    return await createGatewayErrorFromResponse({
        response: {},
        statusCode: 500,
        defaultMessage: error instanceof Error ? `Gateway request failed: ${error.message}` : "Unknown Gateway error",
        cause: error,
        authMethod
    });
}
// src/gateway-headers.ts
var GATEWAY_AUTH_METHOD_HEADER = "ai-gateway-auth-method";
var VERCEL_AI_GATEWAY_TEAM_HEADER = "x-vercel-ai-gateway-team";
;
async function parseAuthMethod(headers) {
    const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["safeValidateTypes"])({
        value: headers[GATEWAY_AUTH_METHOD_HEADER],
        schema: gatewayAuthMethodSchema
    });
    return result.success ? result.value : void 0;
}
var gatewayAuthMethodSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.union([
        z.literal("api-key"),
        z.literal("oidc")
    ])));
;
// src/gateway-model-entry.ts
var KNOWN_MODEL_TYPES = [
    "embedding",
    "image",
    "language",
    "realtime",
    "reranking",
    "speech",
    "transcription",
    "video"
];
// src/gateway-fetch-metadata.ts
var GatewayFetchMetadata = class {
    constructor(config){
        this.config = config;
    }
    async getAvailableModels() {
        try {
            const { value } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getFromApi"])({
                url: `${this.config.baseURL}/config`,
                validateUrl: false,
                headers: this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayAvailableModelsResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                fetch: this.config.fetch
            });
            return value;
        } catch (error) {
            throw await asGatewayError(error);
        }
    }
    async getCredits() {
        try {
            const baseUrl = new URL(this.config.baseURL);
            const { value } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getFromApi"])({
                url: `${baseUrl.origin}/v1/credits`,
                validateUrl: false,
                headers: this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayCreditsResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                fetch: this.config.fetch
            });
            return value;
        } catch (error) {
            throw await asGatewayError(error);
        }
    }
};
var gatewayAvailableModelsResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        models: z.array(z.object({
            id: z.string(),
            name: z.string(),
            description: z.string().nullish(),
            pricing: z.object({
                input: z.string(),
                output: z.string(),
                input_cache_read: z.string().nullish(),
                input_cache_write: z.string().nullish()
            }).transform(({ input, output, input_cache_read, input_cache_write })=>({
                    input,
                    output,
                    ...input_cache_read ? {
                        cachedInputTokens: input_cache_read
                    } : {},
                    ...input_cache_write ? {
                        cacheCreationInputTokens: input_cache_write
                    } : {}
                })).nullish(),
            specification: z.object({
                specificationVersion: z.literal("v4"),
                provider: z.string(),
                modelId: z.string()
            }),
            modelType: z.string().nullish()
        })).transform((models)=>models.filter((m)=>m.modelType == null || KNOWN_MODEL_TYPES.includes(m.modelType)))
    })));
var gatewayCreditsResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        balance: z.string(),
        total_used: z.string()
    }).transform(({ balance, total_used })=>({
            balance,
            totalUsed: total_used
        }))));
;
var GatewaySpendReport = class {
    constructor(config){
        this.config = config;
    }
    async getSpendReport(params) {
        try {
            const baseUrl = new URL(this.config.baseURL);
            const searchParams = new URLSearchParams();
            searchParams.set("start_date", params.startDate);
            searchParams.set("end_date", params.endDate);
            if (params.groupBy) {
                searchParams.set("group_by", params.groupBy);
            }
            if (params.datePart) {
                searchParams.set("date_part", params.datePart);
            }
            if (params.userId) {
                searchParams.set("user_id", params.userId);
            }
            if (params.model) {
                searchParams.set("model", params.model);
            }
            if (params.provider) {
                searchParams.set("provider", params.provider);
            }
            if (params.credentialType) {
                searchParams.set("credential_type", params.credentialType);
            }
            if (params.tags && params.tags.length > 0) {
                searchParams.set("tags", params.tags.join(","));
            }
            const { value } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getFromApi"])({
                url: `${baseUrl.origin}/v1/report?${searchParams.toString()}`,
                validateUrl: false,
                headers: this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewaySpendReportResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                fetch: this.config.fetch
            });
            return value;
        } catch (error) {
            throw await asGatewayError(error);
        }
    }
};
var gatewaySpendReportResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        results: z.array(z.object({
            day: z.string().optional(),
            hour: z.string().optional(),
            user: z.string().optional(),
            model: z.string().optional(),
            tag: z.string().optional(),
            provider: z.string().optional(),
            credential_type: z.enum([
                "byok",
                "system"
            ]).optional(),
            total_cost: z.number(),
            market_cost: z.number().optional(),
            input_tokens: z.number().optional(),
            output_tokens: z.number().optional(),
            cached_input_tokens: z.number().optional(),
            cache_creation_input_tokens: z.number().optional(),
            reasoning_tokens: z.number().optional(),
            request_count: z.number().optional()
        }).transform(({ credential_type, total_cost, market_cost, input_tokens, output_tokens, cached_input_tokens, cache_creation_input_tokens, reasoning_tokens, request_count, ...rest })=>({
                ...rest,
                ...credential_type !== void 0 ? {
                    credentialType: credential_type
                } : {},
                totalCost: total_cost,
                ...market_cost !== void 0 ? {
                    marketCost: market_cost
                } : {},
                ...input_tokens !== void 0 ? {
                    inputTokens: input_tokens
                } : {},
                ...output_tokens !== void 0 ? {
                    outputTokens: output_tokens
                } : {},
                ...cached_input_tokens !== void 0 ? {
                    cachedInputTokens: cached_input_tokens
                } : {},
                ...cache_creation_input_tokens !== void 0 ? {
                    cacheCreationInputTokens: cache_creation_input_tokens
                } : {},
                ...reasoning_tokens !== void 0 ? {
                    reasoningTokens: reasoning_tokens
                } : {},
                ...request_count !== void 0 ? {
                    requestCount: request_count
                } : {}
            })))
    })));
;
var GatewayGenerationInfoFetcher = class {
    constructor(config){
        this.config = config;
    }
    async getGenerationInfo(params) {
        try {
            const baseUrl = new URL(this.config.baseURL);
            const { value } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["getFromApi"])({
                url: `${baseUrl.origin}/v1/generation?id=${encodeURIComponent(params.id)}`,
                validateUrl: false,
                headers: this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayGenerationInfoResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                fetch: this.config.fetch
            });
            return value;
        } catch (error) {
            throw await asGatewayError(error);
        }
    }
};
var gatewayGenerationInfoResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        data: z.object({
            id: z.string(),
            total_cost: z.number(),
            upstream_inference_cost: z.number(),
            usage: z.number(),
            created_at: z.string(),
            model: z.string(),
            is_byok: z.boolean(),
            provider_name: z.string(),
            streamed: z.boolean(),
            finish_reason: z.string(),
            latency: z.number(),
            generation_time: z.number(),
            native_tokens_prompt: z.number(),
            native_tokens_completion: z.number(),
            native_tokens_reasoning: z.number(),
            native_tokens_cached: z.number(),
            native_tokens_cache_creation: z.number(),
            billable_web_search_calls: z.number()
        }).transform(({ total_cost, upstream_inference_cost, created_at, is_byok, provider_name, finish_reason, generation_time, native_tokens_prompt, native_tokens_completion, native_tokens_reasoning, native_tokens_cached, native_tokens_cache_creation, billable_web_search_calls, ...rest })=>({
                ...rest,
                totalCost: total_cost,
                upstreamInferenceCost: upstream_inference_cost,
                createdAt: created_at,
                isByok: is_byok,
                providerName: provider_name,
                finishReason: finish_reason,
                generationTime: generation_time,
                promptTokens: native_tokens_prompt,
                completionTokens: native_tokens_completion,
                reasoningTokens: native_tokens_reasoning,
                cachedTokens: native_tokens_cached,
                cacheCreationTokens: native_tokens_cache_creation,
                billableWebSearchCalls: billable_web_search_calls
            }))
    }).transform(({ data })=>data)));
;
;
var GatewayLanguageModel = class _GatewayLanguageModel {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
        this.supportedUrls = {
            "*/*": [
                /.*/
            ]
        };
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serializeModelOptions"])({
            modelId: model.modelId,
            config: model.config
        });
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new _GatewayLanguageModel(options.modelId, options.config);
    }
    get provider() {
        return this.config.provider;
    }
    async getArgs(options) {
        const { abortSignal: _abortSignal, ...optionsWithoutSignal } = options;
        return {
            args: this.maybeEncodeFileParts(optionsWithoutSignal),
            warnings: []
        };
    }
    async doGenerate(options) {
        const { args, warnings } = await this.getArgs(options);
        const { abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody, rawValue: rawResponse } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, options.headers, this.getModelConfigHeaders(this.modelId, false), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: args,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(z.any()),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                ...responseBody,
                request: {
                    body: args
                },
                response: {
                    headers: responseHeaders,
                    body: rawResponse
                },
                warnings
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    async doStream(options) {
        const { args, warnings } = await this.getArgs(options);
        const { abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { value: response, responseHeaders } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, options.headers, this.getModelConfigHeaders(this.modelId, true), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: args,
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createEventSourceResponseHandler"])(z.any()),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                stream: response.pipeThrough(new TransformStream({
                    start (controller) {
                        if (warnings.length > 0) {
                            controller.enqueue({
                                type: "stream-start",
                                warnings
                            });
                        }
                    },
                    transform (chunk, controller) {
                        if (chunk.success) {
                            const streamPart = chunk.value;
                            if (streamPart.type === "raw" && !options.includeRawChunks) {
                                return;
                            }
                            if (streamPart.type === "response-metadata" && streamPart.timestamp && typeof streamPart.timestamp === "string") {
                                streamPart.timestamp = new Date(streamPart.timestamp);
                            }
                            controller.enqueue(streamPart);
                        } else {
                            controller.error(chunk.error);
                        }
                    }
                })),
                request: {
                    body: args
                },
                response: {
                    headers: responseHeaders
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    /**
   * Encodes inline `Uint8Array` file data to a base64 string in place.
   * @param options - The options to encode.
   * @returns The options with the file data encoded.
   */ maybeEncodeFileParts(options) {
        for (const message of options.prompt){
            if (!Array.isArray(message.content)) {
                continue;
            }
            for (const part of message.content){
                if (part.type === "file" || part.type === "reasoning-file") {
                    part.data = maybeBase64EncodeFileData(part.data);
                } else if (part.type === "tool-result" && part.output.type === "content") {
                    for (const contentPart of part.output.value){
                        if (contentPart.type === "file") {
                            contentPart.data = maybeBase64EncodeFileData(contentPart.data);
                        }
                    }
                }
            }
        }
        return options;
    }
    getUrl() {
        return `${this.config.baseURL}/language-model`;
    }
    getModelConfigHeaders(modelId, streaming) {
        return {
            "ai-language-model-specification-version": "4",
            "ai-language-model-id": modelId,
            "ai-language-model-streaming": String(streaming)
        };
    }
};
function maybeBase64EncodeFileData(data) {
    if (data.type === "data") {
        const bytes = data.data;
        if (bytes instanceof Uint8Array) {
            return {
                ...data,
                data: Buffer.from(bytes).toString("base64")
            };
        }
    }
    return data;
}
// src/gateway-language-model-batch.ts
var GatewayBatchLanguageModel = class _GatewayBatchLanguageModel extends GatewayLanguageModel {
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return GatewayLanguageModel[__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model);
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new _GatewayBatchLanguageModel(options.modelId, options.config);
    }
    constructor(modelId, config){
        super(modelId, config);
    }
    /**
   * Starts a durable batch of text-generation requests through the Gateway's
   * async batch surface (`POST {baseURL}/batch/start`). The returned
   * `batchId` is the Gateway job id — provider-native batch ids stay
   * server-side, so status and results always route back through the
   * Gateway job.
   */ async experimental_doStartBatch({ requests, providerOptions, headers, abortSignal, webhookUrl }) {
        var _a12;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        const idempotencyKey = getGatewayBatchIdempotencyKey(providerOptions);
        const forwardedProviderOptions = omitGatewayIdempotencyKey(providerOptions);
        try {
            const { value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getBatchUrl("start"),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers, this.getBatchConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders), idempotencyKey != null ? {
                    "idempotency-key": idempotencyKey
                } : void 0),
                body: {
                    ...webhookUrl != null && {
                        callbackUrl: webhookUrl
                    },
                    modelId: this.modelId,
                    requests: requests.map((request)=>({
                            id: request.id,
                            options: this.maybeEncodeFileParts(request.options)
                        })),
                    ...forwardedProviderOptions != null && {
                        providerOptions: forwardedProviderOptions
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayBatchStartResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                batchId: responseBody.batchId,
                ...convertGatewayBatchStatus(responseBody),
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : []
            };
        } catch (error) {
            if (isAbortOrTimeoutError(error)) {
                throw error;
            }
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    /**
   * Retrieves the lifecycle status of a Gateway batch job
   * (`POST {baseURL}/batch/status`).
   */ async experimental_doGetBatchStatus({ batchId, headers, abortSignal }) {
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getBatchUrl("status"),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers, this.getBatchConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    batchId
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayBatchStatusResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return convertGatewayBatchStatus(responseBody);
        } catch (error) {
            if (isAbortOrTimeoutError(error)) {
                throw error;
            }
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    /**
   * Streams the per-request results of a terminal Gateway batch job
   * (`POST {baseURL}/batch/results`, `application/x-ndjson`: one
   * `BatchV4ItemResult` JSON object per line). Items are validated minimally
   * (id + status) and passed through — the Gateway sanitizes them
   * server-side. The route responds 400 while the batch is non-terminal.
   */ async experimental_doGetBatchResults({ batchId, headers, abortSignal }) {
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { value: lines } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getBatchUrl("results"),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers, this.getBatchConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    batchId
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonLinesResponseHandler"])(gatewayBatchItemResultLineSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a12;
                        return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a12 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertAsyncIteratorToReadableStream"])(convertGatewayBatchResultLines(lines));
        } catch (error) {
            if (isAbortOrTimeoutError(error)) {
                throw error;
            }
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    getBatchUrl(path) {
        return `${this.config.baseURL}/batch/${path}`;
    }
    getBatchConfigHeaders() {
        return {
            "ai-model-id": this.modelId
        };
    }
};
function getGatewayBatchIdempotencyKey(providerOptions) {
    const gatewayOptions = providerOptions == null ? void 0 : providerOptions.gateway;
    if (gatewayOptions == null || typeof gatewayOptions !== "object" || Array.isArray(gatewayOptions)) {
        return void 0;
    }
    const key = gatewayOptions.idempotencyKey;
    return typeof key === "string" && key.length > 0 ? key : void 0;
}
function omitGatewayIdempotencyKey(providerOptions) {
    const gatewayOptions = providerOptions == null ? void 0 : providerOptions.gateway;
    if (gatewayOptions == null || typeof gatewayOptions !== "object" || Array.isArray(gatewayOptions) || !("idempotencyKey" in gatewayOptions)) {
        return providerOptions;
    }
    const { idempotencyKey: _idempotencyKey, ...restGatewayOptions } = gatewayOptions;
    const restProviderOptions = {
        ...providerOptions
    };
    if (Object.keys(restGatewayOptions).length === 0) {
        delete restProviderOptions.gateway;
    } else {
        restProviderOptions.gateway = restGatewayOptions;
    }
    if (Object.keys(restProviderOptions).length === 0) {
        return void 0;
    }
    return restProviderOptions;
}
function isAbortOrTimeoutError(error) {
    if (!(error instanceof Error || error instanceof DOMException)) {
        return false;
    }
    return error.name === "AbortError" || error.name === "TimeoutError";
}
function convertGatewayBatchStatus(body) {
    var _a12, _b12, _c, _d;
    const requestCounts = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["normalizeBatchRequestCounts"])({
        total: (_a12 = body.requestCounts) == null ? void 0 : _a12.total,
        pending: (_b12 = body.requestCounts) == null ? void 0 : _b12.pending,
        completed: (_c = body.requestCounts) == null ? void 0 : _c.completed,
        failed: (_d = body.requestCounts) == null ? void 0 : _d.failed
    });
    return {
        status: body.status,
        ...body.rawStatus != null && {
            rawStatus: body.rawStatus
        },
        ...requestCounts != null && {
            requestCounts
        },
        ...body.error != null && {
            error: {
                message: body.error.message,
                ...body.error.type != null && {
                    type: body.error.type
                },
                ...body.error.code != null && {
                    code: body.error.code
                },
                ...body.error.statusCode != null && {
                    statusCode: body.error.statusCode
                }
            }
        },
        ...body.createdAt != null && {
            createdAt: body.createdAt
        },
        ...body.expiresAt != null && {
            expiresAt: body.expiresAt
        },
        ...body.providerMetadata != null && {
            providerMetadata: body.providerMetadata
        }
    };
}
async function* convertGatewayBatchResultLines(lines) {
    var _a12;
    for await (const line of lines){
        const item = line;
        if (item.status === "succeeded") {
            const response = (_a12 = item.result) == null ? void 0 : _a12.response;
            if (response !== void 0 && typeof response.timestamp === "string") {
                response.timestamp = new Date(response.timestamp);
            }
        }
        yield item;
    }
}
var gatewayBatchItemResultLineSchema = z.object({
    id: z.string(),
    status: z.enum([
        "cancelled",
        "expired",
        "failed",
        "succeeded"
    ])
}).catchall(z.unknown());
var gatewayBatchErrorSchema = z.object({
    message: z.string(),
    type: z.string().nullish(),
    code: z.string().nullish(),
    statusCode: z.number().nullish()
});
var gatewayBatchRequestCountsSchema = z.object({
    total: z.number().nullish(),
    pending: z.number().nullish(),
    completed: z.number().nullish(),
    failed: z.number().nullish()
});
var gatewayBatchProviderMetadataSchema = z.record(z.string(), z.record(z.string(), z.unknown()));
var gatewayBatchStatusFieldsSchema = z.object({
    status: z.enum([
        "completed",
        "failed",
        "pending"
    ]),
    rawStatus: z.string().nullish(),
    requestCounts: gatewayBatchRequestCountsSchema.nullish(),
    error: gatewayBatchErrorSchema.nullish(),
    createdAt: z.string().nullish(),
    expiresAt: z.string().nullish(),
    providerMetadata: gatewayBatchProviderMetadataSchema.nullish()
});
var gatewayBatchStartResponseSchema = gatewayBatchStatusFieldsSchema.extend({
    batchId: z.string(),
    warnings: z.array(z.object({
        requestId: z.string().nullish(),
        warning: z.unknown()
    }).catchall(z.unknown())).nullish()
});
var gatewayBatchStatusResponseSchema = gatewayBatchStatusFieldsSchema;
;
var GatewayEmbeddingModel = class _GatewayEmbeddingModel {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
        this.maxEmbeddingsPerCall = 2048;
        this.supportsParallelCalls = true;
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serializeModelOptions"])({
            modelId: model.modelId,
            config: model.config
        });
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new _GatewayEmbeddingModel(options.modelId, options.config);
    }
    get provider() {
        return this.config.provider;
    }
    async doEmbed({ values, headers, abortSignal, providerOptions }) {
        var _a12, _b12;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody, rawValue } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    values,
                    ...providerOptions ? {
                        providerOptions
                    } : {}
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayEmbeddingResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                embeddings: responseBody.embeddings,
                usage: (_a12 = responseBody.usage) != null ? _a12 : void 0,
                providerMetadata: responseBody.providerMetadata,
                response: {
                    headers: responseHeaders,
                    body: rawValue
                },
                warnings: (_b12 = responseBody.warnings) != null ? _b12 : []
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    getUrl() {
        return `${this.config.baseURL}/embedding-model`;
    }
    getModelConfigHeaders() {
        return {
            "ai-embedding-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
var gatewayEmbeddingWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewayEmbeddingResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        embeddings: z.array(z.array(z.number())),
        usage: z.object({
            tokens: z.number()
        }).nullish(),
        warnings: z.array(gatewayEmbeddingWarningSchema).optional(),
        providerMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
    })));
;
var GatewayImageModel = class _GatewayImageModel {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
        // Set a very large number to prevent client-side splitting of requests
        this.maxImagesPerCall = Number.MAX_SAFE_INTEGER;
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_SERIALIZE"]](model) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["serializeModelOptions"])({
            modelId: model.modelId,
            config: model.config
        });
    }
    static [__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$workflow$2b$serde$40$4$2e$1$2e$0$2f$node_modules$2f40$workflow$2f$serde$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["WORKFLOW_DESERIALIZE"]](options) {
        return new _GatewayImageModel(options.modelId, options.config);
    }
    get provider() {
        return this.config.provider;
    }
    async doGenerate({ prompt, n, size, aspectRatio, seed, files, mask, providerOptions, headers, abortSignal }) {
        var _a12, _b12, _c, _d;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    prompt,
                    n,
                    ...size && {
                        size
                    },
                    ...aspectRatio && {
                        aspectRatio
                    },
                    ...seed && {
                        seed
                    },
                    ...providerOptions && {
                        providerOptions
                    },
                    ...files && {
                        files: files.map((file)=>maybeEncodeImageFile(file))
                    },
                    ...mask && {
                        mask: maybeEncodeImageFile(mask)
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayImageResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                images: responseBody.images,
                // Always base64 strings from server
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : [],
                providerMetadata: responseBody.providerMetadata,
                response: {
                    timestamp: /* @__PURE__ */ new Date(),
                    modelId: this.modelId,
                    headers: responseHeaders
                },
                ...responseBody.usage != null && {
                    usage: {
                        inputTokens: (_b12 = responseBody.usage.inputTokens) != null ? _b12 : void 0,
                        outputTokens: (_c = responseBody.usage.outputTokens) != null ? _c : void 0,
                        totalTokens: (_d = responseBody.usage.totalTokens) != null ? _d : void 0
                    }
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    getUrl() {
        return `${this.config.baseURL}/image-model`;
    }
    getModelConfigHeaders() {
        return {
            "ai-image-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
function maybeEncodeImageFile(file) {
    if (file.type === "file" && file.data instanceof Uint8Array) {
        return {
            ...file,
            data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertUint8ArrayToBase64"])(file.data)
        };
    }
    return file;
}
var providerMetadataEntrySchema = z.object({
    images: z.array(z.unknown()).optional()
}).catchall(z.unknown());
var gatewayImageWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewayImageUsageSchema = z.object({
    inputTokens: z.number().nullish(),
    outputTokens: z.number().nullish(),
    totalTokens: z.number().nullish()
});
var gatewayImageResponseSchema = z.object({
    images: z.array(z.string()),
    // Always base64 strings over the wire
    warnings: z.array(gatewayImageWarningSchema).optional(),
    providerMetadata: z.record(z.string(), providerMetadataEntrySchema).optional(),
    usage: gatewayImageUsageSchema.optional()
});
;
;
var GatewayVideoModel = class {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
        // Set a very large number to prevent client-side splitting of requests
        this.maxVideosPerCall = Number.MAX_SAFE_INTEGER;
    }
    get provider() {
        return this.config.provider;
    }
    async doGenerate(options) {
        var _a12, _b12;
        const { headers, abortSignal } = options;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders), {
                    accept: "text/event-stream"
                }),
                body: this.buildRequestBody(options),
                successfulResponseHandler: async ({ response, url, requestBodyValues })=>{
                    if (response.body == null) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["APICallError"]({
                            message: "SSE response body is empty",
                            url,
                            requestBodyValues,
                            statusCode: response.status
                        });
                    }
                    const eventStream = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["parseJsonEventStream"])({
                        stream: response.body,
                        schema: gatewayVideoEventSchema
                    });
                    const reader = eventStream.getReader();
                    const { done, value: parseResult } = await reader.read();
                    reader.releaseLock();
                    if (done || !parseResult) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["APICallError"]({
                            message: "SSE stream ended without a data event",
                            url,
                            requestBodyValues,
                            statusCode: response.status
                        });
                    }
                    if (!parseResult.success) {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["APICallError"]({
                            message: "Failed to parse video SSE event",
                            cause: parseResult.error,
                            url,
                            requestBodyValues,
                            statusCode: response.status
                        });
                    }
                    const event = parseResult.value;
                    if (event.type === "error") {
                        throw new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["APICallError"]({
                            message: event.message,
                            statusCode: event.statusCode,
                            url,
                            requestBodyValues,
                            responseHeaders: Object.fromEntries([
                                ...response.headers
                            ]),
                            responseBody: JSON.stringify(event),
                            data: {
                                error: {
                                    message: event.message,
                                    type: event.errorType,
                                    param: event.param
                                }
                            }
                        });
                    }
                    return {
                        value: {
                            videos: event.videos,
                            warnings: event.warnings,
                            providerMetadata: event.providerMetadata
                        },
                        responseHeaders: Object.fromEntries([
                            ...response.headers
                        ])
                    };
                },
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                videos: responseBody.videos,
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : [],
                providerMetadata: (_b12 = responseBody.providerMetadata) != null ? _b12 : void 0,
                response: {
                    timestamp: /* @__PURE__ */ new Date(),
                    modelId: this.modelId,
                    headers: responseHeaders
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    // The Gateway notifies the caller's URL on completion (`doStart` maps it to
    // `callbackUrl`), so the factory's URL and `received` pass straight through.
    async handleWebhookOption({ webhook }) {
        const { url, received } = await webhook();
        return {
            webhookUrl: url,
            received
        };
    }
    async doStart(options) {
        var _a12, _b12;
        const { headers, abortSignal, webhookUrl } = options;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getStartUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    ...this.buildRequestBody(options),
                    // The spec option is `webhookUrl`; the Gateway's wire contract for a
                    // completion webhook is `callbackUrl`.
                    ...webhookUrl && {
                        callbackUrl: webhookUrl
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayVideoStartResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                operation: responseBody.operation,
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : [],
                providerMetadata: (_b12 = responseBody.providerMetadata) != null ? _b12 : void 0,
                response: {
                    timestamp: /* @__PURE__ */ new Date(),
                    modelId: this.modelId,
                    headers: responseHeaders
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    async doStatus({ operation, abortSignal, headers }) {
        var _a12, _b12, _c, _d, _e, _f;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getStatusUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    operation
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayVideoStatusResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            const response = {
                timestamp: /* @__PURE__ */ new Date(),
                modelId: this.modelId,
                headers: responseHeaders
            };
            if (responseBody.status === "completed") {
                return {
                    status: "completed",
                    videos: responseBody.videos,
                    warnings: (_a12 = responseBody.warnings) != null ? _a12 : [],
                    providerMetadata: (_b12 = responseBody.providerMetadata) != null ? _b12 : void 0,
                    response
                };
            }
            if (responseBody.status === "error") {
                return {
                    status: "error",
                    error: responseBody.error,
                    providerMetadata: (_c = responseBody.providerMetadata) != null ? _c : void 0,
                    response
                };
            }
            if (responseBody.status === "cancelled") {
                return {
                    status: "error",
                    error: "Video generation was cancelled.",
                    providerMetadata: (_d = responseBody.providerMetadata) != null ? _d : void 0,
                    response
                };
            }
            return {
                status: "pending",
                warnings: (_e = responseBody.warnings) != null ? _e : [],
                providerMetadata: (_f = responseBody.providerMetadata) != null ? _f : void 0,
                response
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    buildRequestBody({ prompt, n, aspectRatio, resolution, duration, fps, seed, generateAudio, image, frameImages, inputReferences, providerOptions }) {
        return {
            prompt,
            n,
            ...aspectRatio && {
                aspectRatio
            },
            ...resolution && {
                resolution
            },
            ...duration && {
                duration
            },
            ...fps && {
                fps
            },
            ...seed && {
                seed
            },
            ...generateAudio !== void 0 && {
                generateAudio
            },
            ...providerOptions && {
                providerOptions
            },
            ...image && {
                image: maybeEncodeVideoFile(image)
            },
            ...frameImages && {
                frameImages: frameImages.map((frame)=>({
                        ...frame,
                        image: maybeEncodeVideoFile(frame.image)
                    }))
            },
            ...inputReferences && {
                inputReferences: inputReferences.map((reference)=>maybeEncodeVideoFile(reference))
            }
        };
    }
    getUrl() {
        return `${this.config.baseURL}/video-model`;
    }
    getStartUrl() {
        return `${this.config.baseURL}/video-model/start`;
    }
    getStatusUrl() {
        return `${this.config.baseURL}/video-model/status`;
    }
    getModelConfigHeaders() {
        return {
            "ai-video-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
function maybeEncodeVideoFile(file) {
    if (file.type === "file" && file.data instanceof Uint8Array) {
        return {
            ...file,
            data: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertUint8ArrayToBase64"])(file.data)
        };
    }
    return file;
}
var providerMetadataEntrySchema2 = z.object({
    videos: z.array(z.unknown()).optional()
}).catchall(z.unknown());
var gatewayVideoDataSchema = z.union([
    z.object({
        type: z.literal("url"),
        url: z.string(),
        mediaType: z.string()
    }),
    z.object({
        type: z.literal("base64"),
        data: z.string(),
        mediaType: z.string()
    })
]);
var gatewayVideoWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewayVideoEventSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("result"),
        videos: z.array(gatewayVideoDataSchema),
        warnings: z.array(gatewayVideoWarningSchema).optional(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).optional()
    }),
    z.object({
        type: z.literal("error"),
        message: z.string(),
        errorType: z.string(),
        statusCode: z.number(),
        param: z.unknown().nullable()
    })
]);
var gatewayVideoStartResponseSchema = z.object({
    operation: z.unknown(),
    warnings: z.array(gatewayVideoWarningSchema).nullish(),
    providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
});
var gatewayVideoStatusResponseSchema = z.discriminatedUnion("status", [
    z.object({
        status: z.literal("pending"),
        warnings: z.array(gatewayVideoWarningSchema).nullish(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
    }),
    z.object({
        status: z.literal("completed"),
        videos: z.array(gatewayVideoDataSchema),
        warnings: z.array(gatewayVideoWarningSchema).nullish(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
    }),
    z.object({
        status: z.literal("error"),
        error: z.string(),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
    }),
    z.object({
        status: z.literal("cancelled"),
        providerMetadata: z.record(z.string(), providerMetadataEntrySchema2).nullish()
    })
]);
;
var GatewayRerankingModel = class {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
    }
    get provider() {
        return this.config.provider;
    }
    async doRerank({ documents, query, topN, headers, abortSignal, providerOptions }) {
        var _a12;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody, rawValue } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    documents,
                    query,
                    ...topN != null ? {
                        topN
                    } : {},
                    ...providerOptions ? {
                        providerOptions
                    } : {}
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayRerankingResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                ranking: responseBody.ranking,
                providerMetadata: responseBody.providerMetadata,
                response: {
                    headers: responseHeaders,
                    body: rawValue
                },
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : []
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    getUrl() {
        return `${this.config.baseURL}/reranking-model`;
    }
    getModelConfigHeaders() {
        return {
            "ai-reranking-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
var gatewayRerankingWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewayRerankingResponseSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        ranking: z.array(z.object({
            index: z.number(),
            relevanceScore: z.number()
        })),
        warnings: z.array(gatewayRerankingWarningSchema).optional(),
        providerMetadata: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
    })));
;
var GatewaySpeechModel = class {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
    }
    get provider() {
        return this.config.provider;
    }
    async doGenerate({ text, voice, outputFormat, instructions, speed, language, providerOptions, headers, abortSignal }) {
        var _a12;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody, rawValue } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    text,
                    ...voice && {
                        voice
                    },
                    ...outputFormat && {
                        outputFormat
                    },
                    ...instructions && {
                        instructions
                    },
                    ...speed != null && {
                        speed
                    },
                    ...language && {
                        language
                    },
                    ...providerOptions && {
                        providerOptions
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewaySpeechResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                audio: responseBody.audio,
                warnings: (_a12 = responseBody.warnings) != null ? _a12 : [],
                providerMetadata: responseBody.providerMetadata,
                response: {
                    timestamp: /* @__PURE__ */ new Date(),
                    modelId: this.modelId,
                    headers: responseHeaders,
                    body: rawValue
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    getUrl() {
        return `${this.config.baseURL}/speech-model`;
    }
    getModelConfigHeaders() {
        return {
            "ai-speech-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
var providerMetadataEntrySchema3 = z.object({}).catchall(z.unknown());
var gatewaySpeechWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewaySpeechResponseSchema = z.object({
    audio: z.string(),
    warnings: z.array(gatewaySpeechWarningSchema).optional(),
    providerMetadata: z.record(z.string(), providerMetadataEntrySchema3).optional()
});
;
;
var GatewayTranscriptionModel = class {
    constructor(modelId, config){
        this.modelId = modelId;
        this.config = config;
        this.specificationVersion = "v4";
    }
    get provider() {
        return this.config.provider;
    }
    async doGenerate({ audio, mediaType, providerOptions, headers, abortSignal }) {
        var _a12, _b12, _c, _d;
        const resolvedHeaders = this.config.headers ? await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.headers) : void 0;
        try {
            const { responseHeaders, value: responseBody, rawValue } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url: this.getUrl(),
                headers: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(resolvedHeaders, headers != null ? headers : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders)),
                body: {
                    audio: audio instanceof Uint8Array ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertUint8ArrayToBase64"])(audio) : audio,
                    mediaType,
                    ...providerOptions && {
                        providerOptions
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayTranscriptionResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                ...abortSignal && {
                    abortSignal
                },
                fetch: this.config.fetch
            });
            return {
                text: responseBody.text,
                segments: (_a12 = responseBody.segments) != null ? _a12 : [],
                language: (_b12 = responseBody.language) != null ? _b12 : void 0,
                durationInSeconds: (_c = responseBody.durationInSeconds) != null ? _c : void 0,
                warnings: (_d = responseBody.warnings) != null ? _d : [],
                providerMetadata: responseBody.providerMetadata,
                response: {
                    timestamp: /* @__PURE__ */ new Date(),
                    modelId: this.modelId,
                    headers: responseHeaders,
                    body: rawValue
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(resolvedHeaders != null ? resolvedHeaders : {}));
        }
    }
    async doStream(options) {
        var _a12, _b12, _c, _d, _e;
        const currentDate = (_c = (_b12 = (_a12 = this.config._internal) == null ? void 0 : _a12.currentDate) == null ? void 0 : _b12.call(_a12)) != null ? _c : /* @__PURE__ */ new Date();
        const headers = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["combineHeaders"])(await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])((_d = this.config.headers) != null ? _d : {}), (_e = options.headers) != null ? _e : {}, this.getModelConfigHeaders(), await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["resolve"])(this.config.o11yHeaders));
        const authMethod = await parseAuthMethod(headers);
        const startFrame = {
            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["EXPERIMENTAL_TRANSCRIPTION_STREAM_START_FRAME_TYPE"],
            inputAudioFormat: options.inputAudioFormat,
            ...options.providerOptions != null && {
                providerOptions: options.providerOptions
            },
            ...options.includeRawChunks != null && {
                includeRawChunks: options.includeRawChunks
            }
        };
        return {
            stream: createGatewayTranscriptionStream({
                webSocket: this.config.webSocket,
                url: toGatewayTranscriptionUrl(this.config.baseURL, this.modelId),
                protocols: getProtocolsFromHeaders(headers),
                headers,
                startFrame,
                audio: options.audio,
                abortSignal: options.abortSignal,
                authMethod
            }),
            request: {
                body: startFrame
            },
            response: {
                timestamp: currentDate,
                modelId: this.modelId
            }
        };
    }
    getUrl() {
        return `${this.config.baseURL}/transcription-model`;
    }
    getModelConfigHeaders() {
        return {
            "ai-transcription-model-specification-version": "4",
            "ai-model-id": this.modelId
        };
    }
};
function toGatewayTranscriptionUrl(baseURL, modelId) {
    const url = new URL(`${baseURL.replace(/^http/, "ws")}/transcription-model`);
    url.searchParams.set("ai-model-id", modelId);
    return url.toString();
}
function getProtocolsFromHeaders(headers) {
    const normalizedHeaders = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["normalizeHeaders"])(headers);
    const authorization = normalizedHeaders.authorization;
    const token = (authorization == null ? void 0 : authorization.startsWith("Bearer ")) ? authorization.slice("Bearer ".length) : void 0;
    return token == null ? [
        GATEWAY_TRANSCRIPTION_SUBPROTOCOL
    ] : getGatewayTranscriptionProtocols(token, {
        teamIdOrSlug: normalizedHeaders[VERCEL_AI_GATEWAY_TEAM_HEADER]
    });
}
var MAX_AUDIO_FRAME_BYTES = 64 * 1024;
function createGatewayTranscriptionStream({ webSocket, url, protocols, headers, startFrame, audio, abortSignal, authMethod }) {
    let finished = false;
    let cleanup = ()=>{};
    return new ReadableStream({
        start: (controller)=>{
            let audioReader;
            let hasServerErrorPart = false;
            let lastServerError;
            let audioStopped = false;
            let connection;
            cleanup = (closeCode)=>{
                if (audioReader != null) {
                    void audioReader.cancel().catch(()=>{});
                } else {
                    void audio.cancel().catch(()=>{});
                }
                connection == null ? void 0 : connection.close(closeCode);
            };
            const stopAudio = ()=>{
                audioStopped = true;
                if (audioReader != null) {
                    void audioReader.cancel().catch(()=>{});
                    audioReader = void 0;
                } else {
                    void audio.cancel().catch(()=>{});
                }
            };
            const finishWithError = (error)=>{
                if (finished) return;
                finished = true;
                cleanup();
                void errorControllerWithGatewayError(controller, error, authMethod);
            };
            const sendAudio = async (socket)=>{
                const reader = audio.getReader();
                audioReader = reader;
                try {
                    while(true){
                        const { done, value } = await reader.read();
                        if (done || finished) break;
                        const bytes = typeof value === "string" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["convertBase64ToUint8Array"])(value) : value;
                        for(let offset = 0; offset < bytes.length; offset += MAX_AUDIO_FRAME_BYTES){
                            if (finished) break;
                            socket.send(bytes.subarray(offset, offset + MAX_AUDIO_FRAME_BYTES));
                            await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["waitForWebSocketBufferDrain"])(socket);
                        }
                    }
                } finally{
                    reader.releaseLock();
                    if (audioReader === reader) {
                        audioReader = void 0;
                    }
                }
                if (!finished && !audioStopped) {
                    socket.send(JSON.stringify({
                        type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["EXPERIMENTAL_TRANSCRIPTION_STREAM_AUDIO_DONE_FRAME_TYPE"]
                    }));
                }
            };
            connection = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["connectToWebSocket"])({
                url,
                protocols,
                headers,
                webSocket,
                abortSignal,
                onAbort: (reason)=>{
                    if (finished) return;
                    finished = true;
                    cleanup();
                    controller.error(reason);
                },
                onProcessingError: finishWithError,
                onOpen: (socket)=>{
                    socket.send(JSON.stringify(startFrame));
                    void sendAudio(socket).catch(finishWithError);
                },
                // Server frames are envelope-serialized stream parts; the codec
                // handles parsing, unknown-part skipping, and timestamp revival.
                onMessageText: (text)=>{
                    if (finished) return;
                    const part = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["experimental_parseTranscriptionStreamPart"])(text);
                    if (part == null) return;
                    if (part.type === "finish") {
                        finished = true;
                        controller.enqueue(part);
                        controller.close();
                        cleanup(1e3);
                        return;
                    }
                    if (part.type === "error") {
                        hasServerErrorPart = true;
                        lastServerError = part.error;
                        stopAudio();
                    }
                    controller.enqueue(part);
                },
                onSocketError: ()=>{
                    finishWithError(new Error("Connection error on AI Gateway transcription stream"));
                },
                onClose: ()=>{
                    if (hasServerErrorPart) {
                        if (finished) return;
                        void createErrorFromServerErrorPart(lastServerError, authMethod).then(finishWithError);
                        return;
                    }
                    finishWithError(new Error("AI Gateway transcription stream closed before a finish part was received"));
                }
            });
        },
        cancel: ()=>{
            if (finished) return;
            finished = true;
            cleanup();
        }
    });
}
var providerMetadataEntrySchema4 = z.object({}).catchall(z.unknown());
var gatewayTranscriptionWarningSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("unsupported"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("compatibility"),
        feature: z.string(),
        details: z.string().optional()
    }),
    z.object({
        type: z.literal("deprecated"),
        setting: z.string(),
        message: z.string()
    }),
    z.object({
        type: z.literal("other"),
        message: z.string()
    })
]);
var gatewayTranscriptionResponseSchema = z.object({
    text: z.string(),
    segments: z.array(z.object({
        text: z.string(),
        startSecond: z.number(),
        endSecond: z.number()
    })).optional(),
    language: z.string().nullish(),
    durationInSeconds: z.number().nullish(),
    warnings: z.array(gatewayTranscriptionWarningSchema).optional(),
    providerMetadata: z.record(z.string(), providerMetadataEntrySchema4).optional()
});
async function errorControllerWithGatewayError(controller, error, authMethod) {
    controller.error(await asGatewayError(error, authMethod));
}
function getServerErrorMessage(error) {
    if (error != null && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(error);
}
var SERVER_ERROR_STATUS_CODES = {
    authentication_error: 401,
    failed_dependency: 424,
    forbidden: 403,
    internal_server_error: 500,
    invalid_request_error: 400,
    model_not_found: 404,
    rate_limit_exceeded: 429
};
async function createErrorFromServerErrorPart(error, authMethod) {
    if (typeof error === "object" && error != null && "message" in error && typeof error.message === "string" && "type" in error && typeof error.type === "string" && error.type in SERVER_ERROR_STATUS_CODES) {
        return createGatewayErrorFromResponse({
            response: {
                error: {
                    message: error.message,
                    type: error.type
                }
            },
            statusCode: SERVER_ERROR_STATUS_CODES[error.type],
            authMethod
        });
    }
    return new Error(`AI Gateway transcription stream failed: ${getServerErrorMessage(error)}`);
}
// src/gateway-realtime-model.ts
var GatewayRealtimeModel = class {
    constructor(modelId, config){
        this.specificationVersion = "v4";
        this.modelId = modelId;
        this.provider = config.provider;
        this.config = config;
    }
    /**
   * Mints a single-use, short-lived client secret (`vcst_`) the browser uses to
   * open the realtime WebSocket without ever holding the long-lived Gateway
   * credential. The customer's server calls this (via
   * `gateway.experimental_realtime.getToken`) and hands the returned token to
   * the browser, which connects with it through the `ai-gateway-auth.<token>`
   * subprotocol. `expiresAfterSeconds` is forwarded to the mint endpoint;
   * `sessionConfig` is intentionally unused here — it is applied later via the
   * normalized `session-update` event.
   */ async doCreateClientSecret(options) {
        const secret = await this.config.createClientSecret({
            modelId: this.modelId,
            ...(options == null ? void 0 : options.expiresAfterSeconds) != null && {
                expiresAfterSeconds: options.expiresAfterSeconds
            }
        });
        return {
            token: secret.token,
            url: toGatewayRealtimeUrl(this.config.baseURL, this.modelId),
            ...secret.expiresAt != null && {
                expiresAt: secret.expiresAt
            }
        };
    }
    getWebSocketConfig(options) {
        return {
            url: options.url,
            protocols: getGatewayRealtimeProtocols(options.token, {
                teamIdOrSlug: this.config.teamIdOrSlug
            })
        };
    }
    parseServerEvent(raw) {
        return raw;
    }
    serializeClientEvent(event) {
        return event;
    }
    buildSessionConfig(config) {
        return config;
    }
};
function toGatewayRealtimeUrl(baseURL, modelId) {
    const url = new URL(`${baseURL.replace(/^http/, "ws")}/realtime-model`);
    url.searchParams.set("ai-model-id", modelId);
    return url.toString();
}
;
var exaSearchInputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        query: z.string().describe("Natural-language web search query. This is required."),
        type: z.enum([
            "auto",
            "fast",
            "instant"
        ]).optional().describe("Search method. Use auto for the default balance of speed and quality."),
        num_results: z.number().optional().describe("Maximum number of results to return (1-100, default: 10)."),
        category: z.enum([
            "company",
            "people",
            "research paper",
            "news",
            "personal site",
            "financial report"
        ]).optional().describe("Optional content category to focus results."),
        user_location: z.string().optional().describe("Two-letter ISO country code such as 'US'."),
        include_domains: z.array(z.string()).optional().describe("Only return results from these domains."),
        exclude_domains: z.array(z.string()).optional().describe("Exclude results from these domains."),
        start_published_date: z.string().optional().describe("Only return links published after this ISO 8601 date."),
        end_published_date: z.string().optional().describe("Only return links published before this ISO 8601 date."),
        contents: z.object({
            text: z.union([
                z.boolean(),
                z.object({
                    max_characters: z.number().optional(),
                    include_html_tags: z.boolean().optional(),
                    verbosity: z.enum([
                        "compact",
                        "standard",
                        "full"
                    ]).optional(),
                    include_sections: z.array(z.enum([
                        "header",
                        "navigation",
                        "banner",
                        "body",
                        "sidebar",
                        "footer",
                        "metadata"
                    ])).optional(),
                    exclude_sections: z.array(z.enum([
                        "header",
                        "navigation",
                        "banner",
                        "body",
                        "sidebar",
                        "footer",
                        "metadata"
                    ])).optional()
                })
            ]).optional(),
            highlights: z.union([
                z.boolean(),
                z.object({
                    query: z.string().optional(),
                    max_characters: z.number().optional()
                })
            ]).optional(),
            max_age_hours: z.number().optional(),
            livecrawl_timeout: z.number().optional(),
            subpages: z.number().optional(),
            subpage_target: z.union([
                z.string(),
                z.array(z.string())
            ]).optional(),
            extras: z.object({
                links: z.number().optional(),
                image_links: z.number().optional()
            }).optional()
        }).optional().describe("Controls extracted page content and freshness.")
    })));
var exaSearchOutputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.union([
        z.object({
            requestId: z.string(),
            searchType: z.string().optional(),
            resolvedSearchType: z.string().optional(),
            results: z.array(z.object({
                title: z.string(),
                url: z.string(),
                id: z.string(),
                publishedDate: z.string().nullable().optional(),
                author: z.string().nullable().optional(),
                image: z.string().nullable().optional(),
                favicon: z.string().nullable().optional(),
                text: z.string().optional(),
                highlights: z.array(z.string()).optional(),
                highlightScores: z.array(z.number()).optional(),
                summary: z.string().optional(),
                subpages: z.array(z.any()).optional(),
                extras: z.object({
                    links: z.array(z.string()).optional(),
                    imageLinks: z.array(z.string()).optional()
                }).optional()
            })),
            costDollars: z.object({
                total: z.number().optional(),
                search: z.record(z.string(), z.number()).optional()
            }).optional()
        }),
        z.object({
            error: z.enum([
                "api_error",
                "rate_limit",
                "timeout",
                "invalid_input",
                "configuration_error",
                "execution_error",
                "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
        })
    ])));
var exaSearchToolFactory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderExecutedToolFactory"])({
    id: "gateway.exa_search",
    inputSchema: exaSearchInputSchema,
    outputSchema: exaSearchOutputSchema
});
var exaSearch = (config = {})=>exaSearchToolFactory(config);
;
var parallelSearchInputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        objective: z.string().describe("Natural-language description of the web research goal, including source or freshness guidance and broader context from the task. Maximum 5000 characters."),
        search_queries: z.array(z.string()).optional().describe("Optional search queries to supplement the objective. Maximum 200 characters per query."),
        mode: z.enum([
            "one-shot",
            "agentic"
        ]).optional().describe('Mode preset: "one-shot" for comprehensive results with longer excerpts (default), "agentic" for concise, token-efficient results for multi-step workflows.'),
        max_results: z.number().optional().describe("Maximum number of results to return (1-20). Defaults to 10 if not specified."),
        source_policy: z.object({
            include_domains: z.array(z.string()).optional().describe("Limit results to these domains. Use plain domain names only \u2014 e.g. example.com or sub.example.gov, or a bare extension like .edu. Do not include a scheme, path, or port (e.g. not https://example.com/page)."),
            exclude_domains: z.array(z.string()).optional().describe("Exclude results from these domains. Use plain domain names only \u2014 e.g. example.com or sub.example.gov, or a bare extension like .edu. Do not include a scheme, path, or port (e.g. not https://example.com/page)."),
            after_date: z.string().optional().describe("Only include results published after this date. Use an ISO 8601 calendar date formatted YYYY-MM-DD (e.g. 2025-01-01); do not include a time.")
        }).optional().describe("Source policy for controlling which domains to include/exclude and freshness."),
        excerpts: z.object({
            max_chars_per_result: z.number().optional().describe("Maximum characters per result."),
            max_chars_total: z.number().optional().describe("Maximum total characters across all results.")
        }).optional().describe("Excerpt configuration for controlling result length."),
        fetch_policy: z.object({
            max_age_seconds: z.number().optional().describe("Maximum age in seconds for cached content. Set to 0 to always fetch fresh content.")
        }).optional().describe("Fetch policy for controlling content freshness.")
    })));
var parallelSearchOutputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.union([
        // Success response
        z.object({
            searchId: z.string(),
            results: z.array(z.object({
                url: z.string(),
                title: z.string(),
                excerpt: z.string(),
                publishDate: z.string().nullable().optional(),
                relevanceScore: z.number().optional()
            }))
        }),
        // Error response
        z.object({
            error: z.enum([
                "api_error",
                "rate_limit",
                "timeout",
                "invalid_input",
                "configuration_error",
                "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
        })
    ])));
var parallelSearchToolFactory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderExecutedToolFactory"])({
    id: "gateway.parallel_search",
    inputSchema: parallelSearchInputSchema,
    outputSchema: parallelSearchOutputSchema
});
var parallelSearch = (config = {})=>parallelSearchToolFactory(config);
;
var perplexitySearchInputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        query: z.union([
            z.string(),
            z.array(z.string())
        ]).describe("Search query (string) or multiple queries (array of up to 5 strings). Multi-query searches return combined results from all queries."),
        max_results: z.number().optional().describe("Maximum number of search results to return (1-20, default: 10)"),
        max_tokens_per_page: z.number().optional().describe("Maximum number of tokens to extract per search result page (256-2048, default: 2048)"),
        max_tokens: z.number().optional().describe("Maximum total tokens across all search results (default: 25000, max: 1000000)"),
        country: z.string().optional().describe("Two-letter ISO 3166-1 alpha-2 country code for regional search results (e.g., 'US', 'GB', 'FR')"),
        search_domain_filter: z.array(z.string()).optional().describe("List of domains to include or exclude from search results (max 20). To include: ['nature.com', 'science.org']. To exclude: ['-example.com', '-spam.net']"),
        search_language_filter: z.array(z.string()).optional().describe("List of ISO 639-1 language codes to filter results (max 10, lowercase). Examples: ['en', 'fr', 'de']"),
        search_after_date: z.string().optional().describe("Include only results published after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."),
        search_before_date: z.string().optional().describe("Include only results published before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."),
        last_updated_after_filter: z.string().optional().describe("Include only results last updated after this date. Format: 'MM/DD/YYYY' (e.g., '3/1/2025'). Cannot be used with search_recency_filter."),
        last_updated_before_filter: z.string().optional().describe("Include only results last updated before this date. Format: 'MM/DD/YYYY' (e.g., '3/15/2025'). Cannot be used with search_recency_filter."),
        search_recency_filter: z.enum([
            "day",
            "week",
            "month",
            "year"
        ]).optional().describe("Filter results by relative time period. Cannot be used with search_after_date or search_before_date.")
    })));
var perplexitySearchOutputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.union([
        // Success response
        z.object({
            results: z.array(z.object({
                title: z.string(),
                url: z.string(),
                snippet: z.string(),
                date: z.string().optional(),
                lastUpdated: z.string().optional()
            })),
            id: z.string()
        }),
        // Error response
        z.object({
            error: z.enum([
                "api_error",
                "rate_limit",
                "timeout",
                "invalid_input",
                "unknown"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
        })
    ])));
var perplexitySearchToolFactory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderExecutedToolFactory"])({
    id: "gateway.perplexity_search",
    inputSchema: perplexitySearchInputSchema,
    outputSchema: perplexitySearchOutputSchema
});
var perplexitySearch = (config = {})=>perplexitySearchToolFactory(config);
;
var takoDataSourceInputSchema = z.object({
    count: z.number().optional().describe("Maximum number of data results to return (1-20). When include_contents is true, each additional result adds its own data surcharge."),
    include_contents: z.boolean().optional().describe("Inline rows for each data result. This adds a data surcharge based on row count and dataset source. To estimate cost, search with include_contents disabled and inspect cards.content.export_pricing. This applies to every returned card; limit sources.data.count and sources.data.max_rows to control cost."),
    mode: z.enum([
        "inline",
        "url"
    ]).optional().describe("Requested data delivery mode. Search card data is always inline."),
    content_format: z.enum([
        "card_json",
        "csv",
        "json_compact",
        "json_records"
    ]).optional().describe("Serialization for inlined card data."),
    max_rows: z.number().optional().describe("Maximum rows to inline per result. Omit to use the allowance in cards.content.export_pricing. A data surcharge applies per 1,000 exported rows; lower values reduce cost."),
    node_ids: z.array(z.string()).optional().describe("Data Graph node IDs to prioritize. Maximum 20."),
    strict: z.boolean().optional().describe("Only return cards matching node_ids. Requires a non-empty node_ids.")
});
var takoWebSourceInputSchema = z.object({
    count: z.number().optional().describe("Maximum number of web results to return (1-20)."),
    include_contents: z.boolean().optional().describe("Inline extracted web page text. This can add a data charge."),
    category: z.enum([
        "finance",
        "news",
        "sports"
    ]).optional().describe("Optional web-result category filter."),
    include_domains: z.array(z.string()).optional().describe("Only return results from these bare domains."),
    exclude_domains: z.array(z.string()).optional().describe("Exclude results from these bare domains."),
    snippet_max_chars: z.number().optional().describe("Maximum characters in each web-result snippet."),
    highlights: z.boolean().optional().describe("Include highlighted passages in web results. Defaults to true in AI Gateway."),
    article_content_max_chars: z.number().optional().describe("Maximum extracted characters per web page when including contents."),
    published_after: z.string().optional().describe("Keep results published on or after this ISO date (YYYY-MM-DD)."),
    published_before: z.string().optional().describe("Keep results published on or before this ISO date (YYYY-MM-DD).")
});
var takoSearchInputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.object({
        query: z.string().describe('Natural-language search query. Include the entity, metric, and time period. Quote a phrase to force it to one entity, for example "Tesla":PRODUCT price.'),
        effort: z.enum([
            "deep",
            "fast",
            "instant"
        ]).optional().describe("Search effort. fast is the balanced default, instant favors cached results and low latency, and deep broadens retrieval with reranking at higher cost and latency."),
        sources: z.object({
            data: takoDataSourceInputSchema.optional(),
            web: takoWebSourceInputSchema.optional()
        }).optional().describe("Sources to search. Omit to search both curated data and the web. When provided, only keys present are searched."),
        location: z.object({
            latitude: z.number().describe("Latitude between -90 and 90."),
            longitude: z.number().describe("Longitude between -180 and 180.")
        }).optional().describe("End-user coordinates for localized results."),
        country_code: z.string().optional().describe("Two-letter ISO 3166-1 country code, such as 'US'."),
        locale: z.string().optional().describe("BCP-47 locale, such as 'en-US'."),
        timezone: z.string().optional().describe("IANA timezone, such as 'America/New_York'."),
        output_settings: z.object({
            image_dark_mode: z.boolean().optional().describe("Render card preview images in dark mode."),
            force_refresh: z.boolean().optional().describe("Instant-effort only. Request a refreshed instant result.")
        }).optional().describe("Controls card rendering in the search response."),
        include_related: z.number().optional().describe("Maximum related search suggestions to include (1-20).")
    })));
var takoDatasetCellSchema = z.union([
    z.boolean(),
    z.number(),
    z.string()
]).nullable();
var takoResultContentSchema = z.object({
    content_format: z.enum([
        "card_json",
        "csv",
        "json_compact",
        "json_records"
    ]).nullish(),
    cost: z.number().optional(),
    data: z.string().nullish(),
    records: z.array(z.record(z.string(), takoDatasetCellSchema)).nullish(),
    dataset: z.object({
        columns: z.array(z.object({
            name: z.string(),
            type: z.enum([
                "boolean",
                "date",
                "datetime",
                "number",
                "string"
            ]),
            unit: z.string().nullish()
        })),
        rows: z.array(z.array(takoDatasetCellSchema)),
        total_rows: z.number(),
        truncated: z.boolean(),
        ref: z.string(),
        sources: z.array(z.object({
            name: z.string(),
            index: z.enum([
                "data",
                "web"
            ]).optional()
        })),
        provenance: z.enum([
            "query",
            "web_extraction"
        ]).optional()
    }).nullish(),
    card_data: z.object({}).passthrough().nullish(),
    card_data_schema: z.object({}).passthrough().nullish(),
    url: z.string().nullish(),
    expires_at: z.string().nullish(),
    total_rows: z.number().nullish(),
    truncated: z.boolean().optional(),
    export_pricing: z.object({
        baseline_usd: z.number(),
        free_rows: z.number(),
        max_rows_ceiling: z.number(),
        row_cpm_usd: z.number()
    }).nullish(),
    manifest: z.array(z.object({
        dtype: z.enum([
            "boolean",
            "date",
            "datetime",
            "number",
            "string"
        ]).nullish(),
        entity: z.string().nullish(),
        metric: z.string().nullish(),
        name: z.string().nullish(),
        unit: z.string().nullish()
    })).nullish()
}).passthrough();
var takoCardSchema = z.object({
    card_id: z.string().nullish(),
    title: z.string().nullish(),
    description: z.string().nullish(),
    semantic_description: z.string().nullish(),
    webpage_url: z.string().nullish(),
    image_url: z.string().nullish(),
    embed_url: z.string().nullish(),
    sources: z.array(z.object({
        source_name: z.string().nullish(),
        source_description: z.string().nullish(),
        source_index: z.enum([
            "data",
            "web"
        ]),
        source_text: z.string().nullish(),
        url: z.string().nullish()
    })).nullish(),
    methodologies: z.array(z.object({
        methodology_name: z.string().nullable(),
        methodology_description: z.string().nullable()
    })).nullish(),
    source_indexes: z.array(z.enum([
        "data",
        "web"
    ])).nullish(),
    card_type: z.string().nullish(),
    relevance: z.enum([
        "High",
        "Low",
        "Medium"
    ]).nullish(),
    content: takoResultContentSchema.nullish(),
    exportable: z.boolean().optional(),
    nodes: z.array(z.object({
        id: z.string(),
        type: z.enum([
            "entity",
            "metric"
        ]),
        name: z.string(),
        description: z.string().nullish()
    })).nullish(),
    metric_definitions: z.array(z.object({
        name: z.string(),
        definition: z.string()
    })).nullish(),
    data_freshness: z.object({
        coverage_end: z.string().nullish(),
        data_as_of: z.string().nullish(),
        last_updated: z.string().nullish()
    }).nullish()
}).passthrough();
var takoWebResultSchema = z.object({
    title: z.string(),
    url: z.string(),
    snippet: z.string().nullish(),
    source_name: z.string().nullish(),
    publish_date: z.string().nullish(),
    content: takoResultContentSchema.nullish()
}).passthrough();
var takoSearchOutputSchema = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["lazySchema"])(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["zodSchema"])(z.union([
        z.object({
            request_id: z.string(),
            cards: z.array(takoCardSchema).optional(),
            web_results: z.array(takoWebResultSchema).optional(),
            usage: z.object({
                total_cost_usd: z.number(),
                compute: z.object({
                    cost_usd: z.number()
                }).nullish(),
                data: z.object({
                    cost_usd: z.number(),
                    datasets: z.number()
                }).nullish()
            }).nullish(),
            related: z.array(z.object({}).passthrough()).nullish()
        }).passthrough(),
        z.object({
            error: z.enum([
                "api_error",
                "configuration_error",
                "execution_error",
                "invalid_input",
                "rate_limit",
                "timeout",
                "unknown_tool"
            ]),
            statusCode: z.number().optional(),
            message: z.string()
        })
    ])));
var takoSearchToolFactory = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createProviderExecutedToolFactory"])({
    id: "gateway.tako_search",
    inputSchema: takoSearchInputSchema,
    outputSchema: takoSearchOutputSchema
});
var takoSearch = (config = {})=>takoSearchToolFactory(config);
// src/gateway-tools.ts
var gatewayTools = {
    /**
   * Search the web using Exa for current information and token-efficient
   * excerpts optimized for agent workflows.
   *
   * Supports search type, category, domain, date, location, and content
   * extraction controls.
   */ exaSearch,
    /**
   * Search the web using Parallel AI's Search API for LLM-optimized excerpts.
   *
   * Takes a natural language objective and returns relevant excerpts,
   * replacing multiple keyword searches with a single call for broad
   * or complex queries. Supports different search types for depth vs
   * breadth tradeoffs.
   */ parallelSearch,
    /**
   * Search the web using Perplexity's Search API for real-time information,
   * news, research papers, and articles.
   *
   * Provides ranked search results with advanced filtering options including
   * domain, language, date range, and recency filters.
   */ perplexitySearch,
    /**
   * Search the web and Tako's curated knowledge graph in one call for
   * token-efficient web excerpts and structured data results grounded in
   * premium sources, each with an embed-ready visualization.
   *
   * Supports effort, per-source web and data controls, localization, and inline
   * contents for agents that need to reason over underlying data.
   */ takoSearch
};
;
;
async function getVercelRequestId() {
    var _a12;
    return (_a12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$vercel$2b$oidc$40$3$2e$2$2e$0$2f$node_modules$2f40$vercel$2f$oidc$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getContext"])().headers) == null ? void 0 : _a12["x-vercel-id"];
}
// src/version.ts
var VERSION = ("TURBOPACK compile-time truthy", 1) ? "4.0.72" : "TURBOPACK unreachable";
// src/gateway-provider.ts
var AI_GATEWAY_PROTOCOL_VERSION = "0.0.1";
var gatewayClientSecretResponseSchema = z.object({
    token: z.string(),
    expiresAt: z.number().nullish()
});
function createGateway(options = {}) {
    var _a12, _b12;
    let pendingMetadata = null;
    let metadataCache = null;
    const cacheRefreshMillis = (_a12 = options.metadataCacheRefreshMillis) != null ? _a12 : 1e3 * 60 * 5;
    let lastFetchTime = 0;
    const baseURL = (_b12 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withoutTrailingSlash"])(options.baseURL)) != null ? _b12 : "https://ai-gateway.vercel.sh/v4/ai";
    const createAuthHeaders = (auth)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["withUserAgentSuffix"])({
            Authorization: `Bearer ${auth.token}`,
            "ai-gateway-protocol-version": AI_GATEWAY_PROTOCOL_VERSION,
            [GATEWAY_AUTH_METHOD_HEADER]: auth.authMethod,
            ...options.teamIdOrSlug != null ? {
                [VERCEL_AI_GATEWAY_TEAM_HEADER]: options.teamIdOrSlug
            } : {},
            ...options.headers
        }, `ai-sdk/gateway/${VERSION}`);
    const getHeaders = async ()=>{
        try {
            return createAuthHeaders(await getGatewayAuthToken(options));
        } catch (error) {
            throw GatewayAuthenticationError.createContextualError({
                apiKeyProvided: false,
                oidcTokenProvided: false,
                statusCode: 401,
                cause: error
            });
        }
    };
    const getRealtimeAuthToken = async ()=>{
        try {
            return await getGatewayAuthToken(options);
        } catch (error) {
            throw GatewayAuthenticationError.createContextualError({
                apiKeyProvided: false,
                oidcTokenProvided: false,
                statusCode: 401,
                cause: error
            });
        }
    };
    const mintClientSecret = async (params)=>{
        assertGatewayClientSecretServerEnvironment();
        const auth = await getRealtimeAuthToken();
        const headers = createAuthHeaders(auth);
        const url = new URL("/v1/realtime/client-secrets", baseURL).toString();
        try {
            const { value } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["postJsonToApi"])({
                url,
                headers,
                body: {
                    model: params.modelId,
                    ...params.routeKind != null && {
                        routeKind: params.routeKind
                    },
                    ...params.expiresAfterSeconds != null && {
                        expiresIn: params.expiresAfterSeconds
                    }
                },
                successfulResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonResponseHandler"])(gatewayClientSecretResponseSchema),
                failedResponseHandler: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createJsonErrorResponseHandler"])({
                    errorSchema: z.any(),
                    errorToMessage: (data)=>{
                        var _a13;
                        return (_a13 = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$40$4$2e$0$2e$10$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getErrorMessage"])(data)) != null ? _a13 : "unknown error";
                    }
                }),
                fetch: options.fetch
            });
            return {
                token: value.token,
                ...value.expiresAt != null && {
                    expiresAt: value.expiresAt
                }
            };
        } catch (error) {
            throw await asGatewayError(error, await parseAuthMethod(headers));
        }
    };
    const createO11yHeaders = ()=>{
        const deploymentId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadOptionalSetting"])({
            settingValue: void 0,
            environmentVariableName: "VERCEL_DEPLOYMENT_ID"
        });
        const environment = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadOptionalSetting"])({
            settingValue: void 0,
            environmentVariableName: "VERCEL_ENV"
        });
        const region = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadOptionalSetting"])({
            settingValue: void 0,
            environmentVariableName: "VERCEL_REGION"
        });
        const projectId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadOptionalSetting"])({
            settingValue: void 0,
            environmentVariableName: "VERCEL_PROJECT_ID"
        });
        return async ()=>{
            const requestId = await getVercelRequestId();
            return {
                ...deploymentId && {
                    "ai-o11y-deployment-id": deploymentId
                },
                ...environment && {
                    "ai-o11y-environment": environment
                },
                ...region && {
                    "ai-o11y-region": region
                },
                ...requestId && {
                    "ai-o11y-request-id": requestId
                },
                ...projectId && {
                    "ai-o11y-project-id": projectId
                }
            };
        };
    };
    const createLanguageModel = (modelId)=>{
        return new GatewayBatchLanguageModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    const getAvailableModels = async ()=>{
        var _a13, _b13, _c;
        const now = (_c = (_b13 = (_a13 = options._internal) == null ? void 0 : _a13.currentDate) == null ? void 0 : _b13.call(_a13).getTime()) != null ? _c : Date.now();
        if (!pendingMetadata || now - lastFetchTime > cacheRefreshMillis) {
            lastFetchTime = now;
            pendingMetadata = new GatewayFetchMetadata({
                baseURL,
                headers: getHeaders,
                fetch: options.fetch
            }).getAvailableModels().then((metadata)=>{
                metadataCache = metadata;
                return metadata;
            }).catch(async (error)=>{
                throw await asGatewayError(error, await parseAuthMethod(await getHeaders()));
            });
        }
        return metadataCache ? Promise.resolve(metadataCache) : pendingMetadata;
    };
    const getCredits = async ()=>{
        return new GatewayFetchMetadata({
            baseURL,
            headers: getHeaders,
            fetch: options.fetch
        }).getCredits().catch(async (error)=>{
            throw await asGatewayError(error, await parseAuthMethod(await getHeaders()));
        });
    };
    const getSpendReport = async (params)=>{
        return new GatewaySpendReport({
            baseURL,
            headers: getHeaders,
            fetch: options.fetch
        }).getSpendReport(params).catch(async (error)=>{
            throw await asGatewayError(error, await parseAuthMethod(await getHeaders()));
        });
    };
    const getGenerationInfo = async (params)=>{
        return new GatewayGenerationInfoFetcher({
            baseURL,
            headers: getHeaders,
            fetch: options.fetch
        }).getGenerationInfo(params).catch(async (error)=>{
            throw await asGatewayError(error, await parseAuthMethod(await getHeaders()));
        });
    };
    const provider = function(modelId) {
        if (new.target) {
            throw new Error("The Gateway Provider model function cannot be called with the new keyword.");
        }
        return createLanguageModel(modelId);
    };
    provider.specificationVersion = "v4";
    provider.getAvailableModels = getAvailableModels;
    provider.getCredits = getCredits;
    provider.getSpendReport = getSpendReport;
    provider.getGenerationInfo = getGenerationInfo;
    provider.imageModel = (modelId)=>{
        return new GatewayImageModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    provider.languageModel = createLanguageModel;
    const createEmbeddingModel = (modelId)=>{
        return new GatewayEmbeddingModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    provider.embeddingModel = createEmbeddingModel;
    provider.textEmbeddingModel = createEmbeddingModel;
    provider.videoModel = (modelId)=>{
        return new GatewayVideoModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    const createRerankingModel = (modelId)=>{
        return new GatewayRerankingModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    provider.rerankingModel = createRerankingModel;
    provider.reranking = createRerankingModel;
    const createSpeechModel = (modelId)=>{
        return new GatewaySpeechModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders()
        });
    };
    provider.speechModel = createSpeechModel;
    provider.speech = createSpeechModel;
    const createTranscriptionModel = (modelId)=>{
        return new GatewayTranscriptionModel(modelId, {
            provider: "gateway",
            baseURL,
            headers: getHeaders,
            fetch: options.fetch,
            o11yHeaders: createO11yHeaders(),
            webSocket: options.webSocket
        });
    };
    provider.transcriptionModel = createTranscriptionModel;
    provider.transcription = createTranscriptionModel;
    provider.experimental_transcription = Object.assign((modelId)=>createTranscriptionModel(modelId), {
        getToken: async (tokenOptions)=>{
            const secret = await mintClientSecret({
                modelId: tokenOptions.model,
                routeKind: "transcription",
                ...tokenOptions.expiresAfterSeconds != null && {
                    expiresAfterSeconds: tokenOptions.expiresAfterSeconds
                }
            });
            return {
                token: secret.token,
                url: toGatewayTranscriptionUrl(baseURL, tokenOptions.model),
                ...secret.expiresAt != null && {
                    expiresAt: secret.expiresAt
                }
            };
        }
    });
    const createRealtimeModel = (modelId)=>new GatewayRealtimeModel(modelId, {
            provider: "gateway.realtime",
            baseURL,
            teamIdOrSlug: options.teamIdOrSlug,
            createClientSecret: mintClientSecret
        });
    provider.experimental_realtime = Object.assign((modelId)=>createRealtimeModel(modelId), {
        getToken: async (tokenOptions)=>{
            const { model: modelId, ...secretOptions } = tokenOptions;
            const model = createRealtimeModel(modelId);
            const secret = await model.doCreateClientSecret(secretOptions);
            return {
                token: secret.token,
                url: secret.url,
                ...secret.expiresAt != null && {
                    expiresAt: secret.expiresAt
                }
            };
        }
    });
    provider.chat = provider.languageModel;
    provider.embedding = provider.embeddingModel;
    provider.image = provider.imageModel;
    provider.video = provider.videoModel;
    provider.tools = gatewayTools;
    return provider;
}
var gateway = createGateway();
async function getGatewayAuthToken(options) {
    const apiKey = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$ai$2d$sdk$2b$provider$2d$utils$40$5$2e$0$2e$36$2b$ab3ed8e9421bfd7b$2f$node_modules$2f40$ai$2d$sdk$2f$provider$2d$utils$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["loadOptionalSetting"])({
        settingValue: options.apiKey,
        environmentVariableName: "AI_GATEWAY_API_KEY"
    });
    if (apiKey) {
        return {
            token: apiKey,
            authMethod: "api-key"
        };
    }
    const oidcToken = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f2e$bun$2f40$vercel$2b$oidc$40$3$2e$2$2e$0$2f$node_modules$2f40$vercel$2f$oidc$2f$dist$2f$index$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["getVercelOidcToken"])();
    return {
        token: oidcToken,
        authMethod: "oidc"
    };
}
function assertGatewayClientSecretServerEnvironment() {
    if (typeof globalThis.window !== "undefined") {
        throw new Error("AI Gateway client secrets must be minted server-side: minting needs your Gateway credential, which must never reach the browser. Call gateway.experimental_realtime.getToken() or gateway.experimental_transcription.getToken() from your server and pass the returned token to the client.");
    }
}
;
}),
];

//# sourceMappingURL=01w0_%40ai-sdk_gateway_dist_index_0se23nb.js.map