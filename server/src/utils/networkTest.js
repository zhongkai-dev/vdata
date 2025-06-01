const https = require('https');
const dns = require('dns');
const { promisify } = require('util');
const net = require('net');

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve);

// Test network connectivity to MongoDB Atlas
const testAtlasConnectivity = async (uri) => {
  try {
    // Extract host from MongoDB URI
    let host = '';
    let port = 27017; // Default MongoDB port
    
    if (uri && uri.includes('@') && uri.includes('/')) {
      const parts = uri.split('@');
      if (parts.length > 1) {
        const hostPart = parts[1].split('/')[0];
        
        // Check if port is specified
        if (hostPart.includes(':')) {
          const hostPortParts = hostPart.split(':');
          host = hostPortParts[0];
          port = parseInt(hostPortParts[1], 10);
        } else {
          host = hostPart;
        }
      }
    }

    if (!host) {
      return {
        success: false,
        error: 'Could not extract host from MongoDB URI'
      };
    }

    // Results container
    const results = {
      host,
      port,
      tests: {}
    };

    // 1. Lookup IP for the host
    try {
      const ipResult = await dnsLookup(host);
      results.tests.dnsLookup = {
        success: true,
        ip: ipResult.address,
        family: `IPv${ipResult.family}`
      };
    } catch (error) {
      results.tests.dnsLookup = {
        success: false,
        error: error.message
      };
    }

    // 2. Try to resolve SRV records (used by MongoDB Atlas)
    try {
      const srvRecords = await dnsResolve('_mongodb._tcp.' + host, 'SRV');
      results.tests.srvRecords = {
        success: true,
        count: srvRecords.length,
        sample: srvRecords.slice(0, 2) // Just show a couple of records
      };
    } catch (error) {
      results.tests.srvRecords = {
        success: false,
        error: error.message
      };
    }

    // 3. Test TCP connection to MongoDB port
    try {
      const tcpResult = await new Promise((resolve, reject) => {
        const socket = new net.Socket();
        socket.setTimeout(5000); // 5 second timeout
        
        socket.on('connect', () => {
          socket.end();
          resolve({
            success: true,
            message: `Successfully connected to ${host}:${port}`
          });
        });
        
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error(`Timeout connecting to ${host}:${port}`));
        });
        
        socket.on('error', (err) => {
          reject(err);
        });
        
        socket.connect(port, host);
      });
      
      results.tests.tcpConnection = tcpResult;
    } catch (error) {
      results.tests.tcpConnection = {
        success: false,
        error: error.message
      };
    }
    
    // 4. Test if we can reach MongoDB Atlas status page
    try {
      const atlasStatus = await new Promise((resolve, reject) => {
        const req = https.get('https://status.mongodb.com/', (res) => {
          resolve({
            success: true,
            statusCode: res.statusCode,
            message: 'Successfully connected to MongoDB Atlas status page'
          });
        });
        
        req.on('error', (err) => {
          reject(err);
        });
        
        req.setTimeout(5000, () => {
          req.abort();
          reject(new Error('Timeout connecting to MongoDB status page'));
        });
      });
      
      results.tests.atlasStatus = atlasStatus;
    } catch (error) {
      results.tests.atlasStatus = {
        success: false,
        error: error.message
      };
    }

    // Overall success if key tests passed
    results.success = results.tests.dnsLookup?.success && 
                     (results.tests.tcpConnection?.success || results.tests.srvRecords?.success);
    
    return results;
  } catch (error) {
    return {
      success: false,
      error: error.message,
      name: error.name
    };
  }
};

module.exports = { testAtlasConnectivity }; 