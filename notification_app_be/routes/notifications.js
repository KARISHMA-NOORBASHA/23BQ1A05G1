const express = require('express');
const axios = require('axios');
const { computePriorityScore } = require('../utils/priority');

const router = express.Router();
const EXTERNAL_API = 'http://4.224.186.213/evaluation-service/notifications';
const API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiYXVkIjoiaHR0cDovLzIwLjI0NC41Ni4xNDQvZXZhbHVhdGlvbi1zZXJ2aWNlIiwiZW1haWwiOiJrYXJpc2htYS5ub29yYmFzaGE5OTY2QGdtYWlsLmNvbSIsImV4cCI6MTc4MDYzODcxNiwiaWF0IjoxNzgwNjM3ODE2LCJpc3MiOiJBZmZvcmQgTWVkaWNhbCBUZWNobm9sb2dpZXMgUHJpdmF0ZSBMaW1pdGVkIiwianRpIjoiNWJhZmU4ZGYtN2YwYS00N2MzLTg5ZGEtMTcxODQ5NjE1ODc0IiwibG9jYWxlIjoiZW4tSU4iLCJuYW1lIjoibm9vcmJhc2hhIGthcmlzaG1hIiwic3ViIjoiNDQ4YjdiMTctMWMzYS00MWU2LThmZDEtNmRjYWQ0NzFhMmE0In0sImVtYWlsIjoia2FyaXNobWEubm9vcmJhc2hhOTk2NkBnbWFpbC5jb20iLCJuYW1lIjoibm9vcmJhc2hhIGthcmlzaG1hIiwicm9sbE5vIjoiMjNicTFhMDVnMSIsImFjY2Vzc0NvZGUiOiJRUWRFWXkiLCJjbGllbnRJRCI6IjQ0OGI3YjE3LTFjM2EtNDFlNi04ZmQxLTZkY2FkNDcxYTJhNCIsImNsaWVudFNlY3JldCI6InFjdVRmSHd4a0dCcm1DdkcifQ.XUCyHe-uM2QlFrmnoViEwki7QTbjhe0QN96ShlUWs5M'; // Replace with actual token

// Proxy for all notifications (supports limit, page, notification_type)
router.get('/notifications', async (req, res) => {
  try {
    const { limit, page, notification_type } = req.query;
    const params = {};
    if (limit) params.limit = limit;
    if (page) params.page = page;
    if (notification_type) params.notification_type = notification_type;

    const response = await axios.get(EXTERNAL_API, {
      params,
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'User-Agent': 'Mozilla/5.0'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('API proxy error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Priority inbox endpoint: returns ALL notifications sorted by priority
router.get('/priority', async (req, res) => {
  try {
    const response = await axios.get(EXTERNAL_API, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'User-Agent': 'Mozilla/5.0'
      }
    });
    const notifications = response.data.notifications || [];
    const sorted = [...notifications].sort((a, b) => {
      return computePriorityScore(b) - computePriorityScore(a);
    });
    res.json({ notifications: sorted });
  } catch (error) {
    console.error('Priority API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to compute priority inbox' });
  }
});

module.exports = router;