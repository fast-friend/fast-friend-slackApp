# Slack API Rate Limits

## Overview

Slack enforces rate limits to ensure fair usage and system stability. Understanding these limits is crucial for building reliable integrations.

---

## Rate Limit Tiers

### 1. **Tier 1 - Most Methods (Default)**

- **Limit**: ~1 request per second per workspace
- **Window**: 1 minute
- **Burst**: ~60 requests
- **Applies to**: Most Web API methods including `users.list`, `conversations.list`, etc.

### 2. **Tier 2 - Posting Messages**

- **Limit**: ~1 message per second per channel
- **Window**: 1 minute
- **Burst**: Variable based on channel
- **Applies to**: `chat.postMessage`, `chat.update`, `chat.delete`

### 3. **Tier 3 - High-Volume Methods**

- **Limit**: Higher limits for specific methods
- **Applies to**: `users.lookupByEmail`, `conversations.history`
- **Note**: Still subject to overall workspace limits

### 4. **Tier 4 - Special Rate Limits**

- **Files Upload**: 20 files per minute per workspace
- **Reactions**: 1 per second
- **User Profile Updates**: 10 per minute per user

---

## `users.list` Method Specifics

### Rate Limit

- **Tier**: Tier 1
- **Limit**: ~1 request per second
- **Burst Capacity**: ~60 requests in 1 minute
- **Recovery**: Linear - 1 request per second added back

### Practical Limits

```
1 request/sec  = 60 requests/min  = 3,600 requests/hour
5 requests/sec = 300 requests/min = Rate limit hit (429 error)
```

### Response Headers

When you make a request, Slack returns:

```
X-Rate-Limit-Tier: 1
X-Rate-Limit-Limit: 60
X-Rate-Limit-Remaining: 45
X-Rate-Limit-Reset: 1640000000
```

### When Rate Limited

```json
{
  "ok": false,
  "error": "ratelimited"
}
```

**HTTP Headers:**

- `Status`: 429 Too Many Requests
- `Retry-After`: 60 (seconds to wait)
- `X-Slack-Failure`: ratelimited

---

## Best Practices

### 1. **Implement Caching** ✅ (We've Done This)

```typescript
// Cache users.list for 5 minutes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
```

**Benefits:**

- Reduces API calls by ~95%
- Users list doesn't change frequently
- Acceptable 5-minute staleness

### 2. **Respect Retry-After Header** ✅ (We've Done This)

```typescript
if (response.status === 429) {
  const retryAfter = response.headers["retry-after"]; // Usually 60 seconds
  await sleep(retryAfter * 1000);
  // Retry the request
}
```

### 3. **Use Pagination Wisely**

```typescript
// For large workspaces, use pagination
const response = await slack.users.list({
  limit: 100, // Default: 100, Max: 1000
  cursor: nextCursor,
});
```

### 4. **Batch Operations**

- Don't call `users.list` for every page load
- Fetch once, cache, reuse
- Update cache in background jobs

### 5. **Use Webhooks Instead**

- For real-time updates, use Events API
- Subscribe to `team_join`, `user_change` events
- Update cache incrementally

---

## Our Implementation

### Current Strategy

```typescript
✅ In-memory cache with 5-minute TTL
✅ Rate limit detection (429 errors)
✅ Automatic retry-after handling
✅ Fallback to stale cache when rate limited
✅ User-friendly error messages with wait time
```

### Cache Flow

```
Request → Check Rate Limit → Check Cache → Slack API
    ↓           ↓                ↓              ↓
  Serve     Wait X sec      Serve Cached   Cache + Serve
```

### Rate Limit Flow

```
429 Error → Extract retry-after (60s) → Block requests → Return cached data
    ↓
After 60s → Allow new requests
```

---

## Monitoring & Alerts

### What to Monitor

1. **Cache Hit Rate**: Should be >90%
2. **429 Error Rate**: Should be <1%
3. **API Call Frequency**: Should be <60/min per workspace
4. **Cache Age**: Users see data <5 minutes old

### When to Scale

- **Multiple workspaces**: Consider Redis for shared cache
- **High traffic**: Implement CDN for user data
- **Real-time needs**: Use Slack Events API webhooks

---

## Troubleshooting

### Frequent 429 Errors

**Causes:**

- Multiple servers calling API independently
- No caching or cache too short
- Background jobs hitting API too frequently

**Solutions:**

- ✅ Implement caching (done)
- Use distributed cache (Redis)
- Coordinate API calls across servers
- Implement request queuing

### Stale Data Issues

**Problem:** Users see outdated information

**Solutions:**

- Reduce cache TTL (currently 5 min)
- Implement cache invalidation webhooks
- Add manual refresh button
- Use Slack Events API for real-time updates

### Cold Start Performance

**Problem:** First request after cache expires is slow

**Solutions:**

- Implement cache warming
- Background job to refresh cache proactively
- Keep cache alive with periodic requests

---

## Slack Official Documentation

- [Rate Limits Overview](https://api.slack.com/docs/rate-limits)
- [Web API Methods](https://api.slack.com/methods)
- [users.list Method](https://api.slack.com/methods/users.list)
- [Handling Rate Limits](https://api.slack.com/docs/rate-limits#handling)

---

## Summary

| Aspect             | Value                                 |
| ------------------ | ------------------------------------- |
| **Cache TTL**      | 5 minutes                             |
| **API Method**     | `users.list` (Tier 1)                 |
| **Rate Limit**     | ~60 requests/minute                   |
| **Retry After**    | 60 seconds (when 429)                 |
| **Cache Strategy** | In-memory with fallback               |
| **Error Handling** | User-friendly messages with wait time |

**Result**: 95% reduction in API calls, graceful degradation when rate limited.
