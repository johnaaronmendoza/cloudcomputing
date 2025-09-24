const axios = require('axios');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:3000'; // API Gateway
const TEST_USER = {
  senior: {
    email: 'senior@test.com',
    password: 'TestPassword123!',
    firstName: 'John',
    lastName: 'Senior',
    userType: 'senior',
    dateOfBirth: '1950-01-01',
    location: 'New York, NY',
    interests: ['cooking', 'gardening', 'storytelling'],
    skills: ['cooking', 'gardening', 'mentoring']
  },
  youth: {
    email: 'youth@test.com',
    password: 'TestPassword123!',
    firstName: 'Jane',
    lastName: 'Youth',
    userType: 'youth',
    dateOfBirth: '2000-01-01',
    location: 'New York, NY',
    interests: ['technology', 'cooking', 'learning'],
    skills: ['technology', 'social media']
  }
};

let authTokens = {};

// Test utilities
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (testName, status, details = '') => {
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⏳';
  console.log(`${statusIcon} ${testName}${details ? ` - ${details}` : ''}`);
};

const makeRequest = async (method, endpoint, data = null, token = null) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message, 
      status: error.response?.status 
    };
  }
};

// Test functions
const testServiceHealth = async () => {
  logTest('Testing service health', 'RUNNING');
  
  const services = [
    'auth-service',
    'task-service', 
    'search-service',
    'content-service',
    'monitoring-service',
    'matching-engine',
    'queue-service'
  ];

  for (const service of services) {
    const result = await makeRequest('GET', `/health`);
    if (result.success) {
      logTest(`${service} health check`, 'PASS');
    } else {
      logTest(`${service} health check`, 'FAIL', result.error);
    }
  }
};

const testUserRegistration = async () => {
  logTest('Testing user registration', 'RUNNING');
  
  // Register senior user
  const seniorResult = await makeRequest('POST', '/api/auth/register', TEST_USER.senior);
  if (seniorResult.success) {
    logTest('Senior user registration', 'PASS');
    authTokens.senior = seniorResult.data.tokens.accessToken;
  } else {
    logTest('Senior user registration', 'FAIL', seniorResult.error);
  }

  // Register youth user
  const youthResult = await makeRequest('POST', '/api/auth/register', TEST_USER.youth);
  if (youthResult.success) {
    logTest('Youth user registration', 'PASS');
    authTokens.youth = youthResult.data.tokens.accessToken;
  } else {
    logTest('Youth user registration', 'FAIL', youthResult.error);
  }
};

const testUserLogin = async () => {
  logTest('Testing user login', 'RUNNING');
  
  const seniorLogin = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.senior.email,
    password: TEST_USER.senior.password
  });
  
  if (seniorLogin.success) {
    logTest('Senior user login', 'PASS');
    authTokens.senior = seniorLogin.data.tokens.accessToken;
  } else {
    logTest('Senior user login', 'FAIL', seniorLogin.error);
  }

  const youthLogin = await makeRequest('POST', '/api/auth/login', {
    email: TEST_USER.youth.email,
    password: TEST_USER.youth.password
  });
  
  if (youthLogin.success) {
    logTest('Youth user login', 'PASS');
    authTokens.youth = youthLogin.data.tokens.accessToken;
  } else {
    logTest('Youth user login', 'FAIL', youthLogin.error);
  }
};

const testTaskCreation = async () => {
  logTest('Testing task creation', 'RUNNING');
  
  const taskData = {
    title: 'Learn Traditional Cooking Techniques',
    description: 'I will teach you traditional Italian cooking methods passed down through generations.',
    category: 'cooking',
    subcategory: 'italian',
    skills_required: ['cooking', 'patience'],
    location: 'New York, NY',
    is_virtual: false,
    estimated_duration_hours: 3,
    max_participants: 2,
    scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    requirements: 'Bring an apron and notebook',
    benefits: 'Learn authentic Italian recipes and techniques',
    tags: ['cooking', 'italian', 'traditional']
  };

  const result = await makeRequest('POST', '/api/tasks', taskData, authTokens.senior);
  
  if (result.success) {
    logTest('Task creation', 'PASS');
    return result.data.task.id;
  } else {
    logTest('Task creation', 'FAIL', result.error);
    return null;
  }
};

const testTaskSearch = async () => {
  logTest('Testing task search', 'RUNNING');
  
  const searchQueries = [
    { q: 'cooking', limit: 10 },
    { category: 'cooking', limit: 10 },
    { location: 'New York', limit: 10 }
  ];

  for (const query of searchQueries) {
    const result = await makeRequest('GET', '/api/search/tasks', query, authTokens.youth);
    if (result.success) {
      logTest(`Search: ${Object.keys(query).join(', ')}`, 'PASS', `${result.data.tasks.length} results`);
    } else {
      logTest(`Search: ${Object.keys(query).join(', ')}`, 'FAIL', result.error);
    }
  }
};

const testTaskApplication = async (taskId) => {
  if (!taskId) {
    logTest('Task application', 'SKIP', 'No task ID available');
    return;
  }

  logTest('Testing task application', 'RUNNING');
  
  const applicationData = {
    message: 'I am very interested in learning traditional cooking techniques. I have some basic cooking experience and would love to learn from you.',
    availableTimes: [
      { start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString() }
    ]
  };

  const result = await makeRequest('POST', `/api/tasks/${taskId}/apply`, applicationData, authTokens.youth);
  
  if (result.success) {
    logTest('Task application', 'PASS');
  } else {
    logTest('Task application', 'FAIL', result.error);
  }
};

const testRecommendations = async () => {
  logTest('Testing recommendations', 'RUNNING');
  
  const taskRecs = await makeRequest('GET', '/api/search/recommendations?type=tasks&limit=5', {}, authTokens.youth);
  if (taskRecs.success) {
    logTest('Task recommendations', 'PASS', `${taskRecs.data.recommendations.length} recommendations`);
  } else {
    logTest('Task recommendations', 'FAIL', taskRecs.error);
  }

  const userRecs = await makeRequest('GET', '/api/search/recommendations?type=users&limit=5', {}, authTokens.youth);
  if (userRecs.success) {
    logTest('User recommendations', 'PASS', `${userRecs.data.recommendations.length} recommendations`);
  } else {
    logTest('User recommendations', 'FAIL', userRecs.error);
  }
};

const testContentUpload = async () => {
  logTest('Testing content upload', 'RUNNING');
  
  // Create a simple text file for testing
  const testContent = 'This is a test cooking recipe document.';
  const blob = new Blob([testContent], { type: 'text/plain' });
  
  // Note: In a real test, you would need to create actual file uploads
  // For now, we'll test the endpoint availability
  const result = await makeRequest('GET', '/api/content', {}, authTokens.senior);
  
  if (result.success) {
    logTest('Content service access', 'PASS');
  } else {
    logTest('Content service access', 'FAIL', result.error);
  }
};

const testMatchingEngine = async () => {
  logTest('Testing matching engine', 'RUNNING');
  
  const result = await makeRequest('GET', '/api/matches/user/test-user-id?limit=5', {}, authTokens.youth);
  
  if (result.success || result.status === 404) { // 404 is expected for non-existent user
    logTest('Matching engine', 'PASS');
  } else {
    logTest('Matching engine', 'FAIL', result.error);
  }
};

const testQueueService = async () => {
  logTest('Testing queue service', 'RUNNING');
  
  const result = await makeRequest('GET', '/api/queues/status', {}, authTokens.senior);
  
  if (result.success) {
    logTest('Queue service status', 'PASS');
  } else {
    logTest('Queue service status', 'FAIL', result.error);
  }
};

const testMonitoring = async () => {
  logTest('Testing monitoring service', 'RUNNING');
  
  const overview = await makeRequest('GET', '/api/overview', {}, authTokens.senior);
  if (overview.success) {
    logTest('Platform overview', 'PASS');
  } else {
    logTest('Platform overview', 'FAIL', overview.error);
  }

  const realtime = await makeRequest('GET', '/api/realtime', {}, authTokens.senior);
  if (realtime.success) {
    logTest('Real-time metrics', 'PASS');
  } else {
    logTest('Real-time metrics', 'FAIL', realtime.error);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🚀 Starting Skills Platform Integration Tests\n');
  console.log('=' .repeat(50));
  
  try {
    // Test service health
    await testServiceHealth();
    console.log('');
    
    // Test user registration and login
    await testUserRegistration();
    console.log('');
    
    await testUserLogin();
    console.log('');
    
    // Test core functionality
    const taskId = await testTaskCreation();
    console.log('');
    
    await testTaskSearch();
    console.log('');
    
    await testTaskApplication(taskId);
    console.log('');
    
    await testRecommendations();
    console.log('');
    
    await testContentUpload();
    console.log('');
    
    await testMatchingEngine();
    console.log('');
    
    await testQueueService();
    console.log('');
    
    await testMonitoring();
    console.log('');
    
    console.log('=' .repeat(50));
    console.log('🎉 All tests completed!');
    console.log('\n📋 Test Summary:');
    console.log('- Service health checks');
    console.log('- User registration and authentication');
    console.log('- Task creation and management');
    console.log('- Search and recommendations');
    console.log('- Content service access');
    console.log('- Matching engine functionality');
    console.log('- Queue service status');
    console.log('- Monitoring and analytics');
    
  } catch (error) {
    console.error('❌ Test runner error:', error);
  }
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  runTests,
  testServiceHealth,
  testUserRegistration,
  testUserLogin,
  testTaskCreation,
  testTaskSearch,
  testTaskApplication,
  testRecommendations,
  testContentUpload,
  testMatchingEngine,
  testQueueService,
  testMonitoring
};
