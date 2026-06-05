const axios = require('axios');

// Weight mapping: Placement (3) > Result (2) > Event (1)
const TYPE_WEIGHTS = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

/**
 * Compute priority score for a notification.
 * Higher score = higher priority.
 * Score = (weight * 1e12) - (seconds since timestamp)
 * This ensures weight dominates, but recency breaks ties.
 */
function computePriorityScore(notification) {
  const weight = TYPE_WEIGHTS[notification.Type] || 0;
  const timestamp = new Date(notification.Timestamp.replace(' ', 'T'));
  const secondsSince = (Date.now() - timestamp.getTime()) / 1000;
  return weight * 1e12 - secondsSince;
}

/**
 * Get top N notifications using a min-heap (O(N log N) but memory efficient).
 * For continuous streams, we maintain a fixed-size heap of size N.
 */
function getTopNNotifications(notifications, n = 10) {
  if (!notifications.length) return [];
  // Clone and sort by priority descending (simple for demonstration)
  // In production with streaming, we'd use a min-heap.
  const sorted = [...notifications].sort((a, b) => {
    const scoreA = computePriorityScore(a);
    const scoreB = computePriorityScore(b);
    return scoreB - scoreA;
  });
  return sorted.slice(0, n);
}

/**
 * PriorityInboxMaintainer - Efficiently maintains top N unread notifications
 * using a min-heap (binary heap) for O(log N) insertion.
 * For this assessment, we implement a class to demonstrate streaming efficiency.
 */
class PriorityInboxMaintainer {
  constructor(maxSize = 10) {
    this.maxSize = maxSize;
    this.heap = []; // min-heap based on priority score
  }

  // Helper: heap operations
  _parent(i) { return Math.floor((i - 1) / 2); }
  _left(i) { return 2 * i + 1; }
  _right(i) { return 2 * i + 2; }

  _swap(i, j) {
    [this.heap[i], this.heap[j]] = [this.heap[j], this.heap[i]];
  }

  _heapifyUp(i) {
    while (i > 0 && this.heap[i].priority < this.heap[this._parent(i)].priority) {
      this._swap(i, this._parent(i));
      i = this._parent(i);
    }
  }

  _heapifyDown(i) {
    let smallest = i;
    const left = this._left(i);
    const right = this._right(i);
    if (left < this.heap.length && this.heap[left].priority < this.heap[smallest].priority)
      smallest = left;
    if (right < this.heap.length && this.heap[right].priority < this.heap[smallest].priority)
      smallest = right;
    if (smallest !== i) {
      this._swap(i, smallest);
      this._heapifyDown(smallest);
    }
  }

  addNotification(notification) {
    const priority = computePriorityScore(notification);
    const entry = { notification, priority };

    if (this.heap.length < this.maxSize) {
      this.heap.push(entry);
      this._heapifyUp(this.heap.length - 1);
    } else if (priority > this.heap[0].priority) {
      // Replace root if new has higher priority
      this.heap[0] = entry;
      this._heapifyDown(0);
    }
  }

  getTopN() {
    // Extract in sorted order (descending priority)
    const sorted = [...this.heap].sort((a, b) => b.priority - a.priority);
    return sorted.map(entry => entry.notification);
  }
}

// Stage 1 standalone execution: fetch from API, compute top 10, and log.
async function runStage1() {
  try {
    const response = await axios.get('http://4.224.186.213/evaluation-service/notifications');
    const notifications = response.data.notifications;

    console.log('=== Stage 1: Top 10 Priority Notifications ===\n');
    const top10 = getTopNNotifications(notifications, 10);
    top10.forEach((notif, idx) => {
      const score = computePriorityScore(notif);
      console.log(`${idx + 1}. [${notif.Type}] ${notif.Message} | ${notif.Timestamp} | Score: ${score.toFixed(0)}`);
    });

    // Demonstrate efficient streaming with PriorityInboxMaintainer
    console.log('\n=== Demonstrating streaming efficiency ===');
    const maintainer = new PriorityInboxMaintainer(10);
    notifications.forEach(notif => maintainer.addNotification(notif));
    const streamTop = maintainer.getTopN();
    console.log(`Maintainer top 10 size: ${streamTop.length}`);
    console.log(`First: ${streamTop[0]?.Type} - ${streamTop[0]?.Message}`);
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runStage1();
}

module.exports = { computePriorityScore, getTopNNotifications, PriorityInboxMaintainer };