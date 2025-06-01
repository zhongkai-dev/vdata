const https = require('https');
const dns = require('dns');
const { promisify } = require('util');

const dnsLookup = promisify(dns.lookup);

// Test network connectivity to MongoDB Atlas
const testAtlasConnectivity = async (uri) => {
  try {
    // Extract host from MongoDB URI
    let host = '';
    if (uri && uri.includes('@') && uri.includes('/')) {
      const parts = uri.split('@');
      if (parts.length > 1) {
        const hostPart = parts[1].split('/')[0];
        host = hostPart.split(':')[0]; // Remove port if present
      }
    }

    if (!host) {
      return {
        success: false,
        error: 'Could not extract host from MongoDB URI'
      };
    }

    // Lookup IP for the host
    const ipResult = await dnsLookup(host);
    
    // Test if we can reach MongoDB Atlas status page
    const atlasStatus = await new Promise((resolve) => {
      https.get('https://status.mongodb.com/', (res) => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          message: 'Successfully connected to MongoDB Atlas status page'
        });
      }).on('error', (err) => {
        resolve({
          success: false,
          error: err.message
        });
      });
    });

    return {
      success: true,
      host,
      ip: ipResult.address,
      family: `IPv${ipResult.family}`,
      atlasStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      name: error.name
    };
  }
};

module.exports = { testAtlasConnectivity }; 