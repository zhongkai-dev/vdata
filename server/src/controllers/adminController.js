const User = require('../models/User');
const PhoneNumber = require('../models/PhoneNumber');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Optimized Upload phone numbers
const uploadPhoneNumbers = async (req, res) => {
  try {
    const { numbers } = req.body;
    const BATCH_SIZE = 10000; // Process 10,000 numbers at a time

    if (!numbers || !Array.isArray(numbers)) {
      return res.status(400).json({ message: 'Please provide an array of phone numbers' });
    }

    // Filter out empty strings and duplicates within the initial input array
    const uniqueInputNumbers = [...new Set(numbers.map(num => String(num).trim()).filter(Boolean))];

    if (uniqueInputNumbers.length === 0) {
      return res.status(200).json({
        message: 'No valid phone numbers provided to upload.',
        numbersAdded: 0,
        duplicatesSkipped: 0
      });
    }

    let totalNumbersAdded = 0;
    let totalDuplicatesSkipped = 0;

    for (let i = 0; i < uniqueInputNumbers.length; i += BATCH_SIZE) {
      const batch = uniqueInputNumbers.slice(i, i + BATCH_SIZE);
      let phoneNumbersToInsertInBatch = [];
      let duplicatesInBatch = 0;

      // Find existing numbers in the database for the current batch
      const existingNumbersInDb = await PhoneNumber.find({ number: { $in: batch } }).select('number').lean();
      const existingSet = new Set(existingNumbersInDb.map(item => item.number));

      for (const number of batch) {
        if (existingSet.has(number)) {
          duplicatesInBatch++;
        } else {
          phoneNumbersToInsertInBatch.push({
            number: number,
            isAssigned: false
            // Add any other default fields for PhoneNumberSchema here
          });
        }
      }

      if (phoneNumbersToInsertInBatch.length > 0) {
        try {
          // Attempt to insert the batch. `ordered: false` allows successful inserts even if some fail (e.g. race condition duplicates)
          const result = await PhoneNumber.insertMany(phoneNumbersToInsertInBatch, { ordered: false });
          totalNumbersAdded += result.length;
        } catch (insertError) {
          if (insertError.name === 'BulkWriteError') {
            // `insertError.result.nInserted` gives the count of successfully inserted documents in this batch before an error
            totalNumbersAdded += insertError.result.nInserted;
            // Calculate duplicates that might have caused the error (those not inserted)
            totalDuplicatesSkipped += phoneNumbersToInsertInBatch.length - insertError.result.nInserted;
            console.warn(`BulkWriteError in batch: ${insertError.message}. Some numbers might have been skipped.`);
          } else {
            // For other types of errors, re-throw or handle as appropriate
            console.error('Error during batch insertMany:', insertError);
            // Decide if you want to stop or continue; for now, we'll count them as skipped
            totalDuplicatesSkipped += phoneNumbersToInsertInBatch.length;
          }
        }
      }
      totalDuplicatesSkipped += duplicatesInBatch; // Add duplicates found by pre-checking
    }

    res.status(201).json({
      message: `${totalNumbersAdded} phone numbers added successfully. ${totalDuplicatesSkipped} duplicates were skipped.`,
      numbersAdded: totalNumbersAdded,
      duplicatesSkipped: totalDuplicatesSkipped
    });

  } catch (error) {
    console.error('Error in uploadPhoneNumbers:', error);
    // General error handling, ensure this doesn't mask specific BulkWriteError duplicate counts if possible
    if (error.name === 'BulkWriteError' && error.code === 11000) {
        return res.status(207).json({ // 207 Multi-Status if some operations succeeded
            message: `Upload partially completed. Some duplicates were encountered.`,
            // Specific counts might be hard to get here if error is top-level, rely on batch counts
            error: error.message
        });
    }
    res.status(500).json({ message: 'An unexpected error occurred during phone number upload: ' + error.message });
  }
};

// Get all phone numbers with pagination
const getPhoneNumbers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;
    
    const phoneNumbers = await PhoneNumber.find()
      .skip(skip)
      .limit(limit);
      
    const total = await PhoneNumber.countDocuments();
    
    res.status(200).json({
      phoneNumbers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get phone numbers statistics
const getPhoneNumbersCount = async (req, res) => {
  try {
    // Get total count of phone numbers
    const totalCount = await PhoneNumber.countDocuments();
    
    // Get assigned count directly
    const assignedCount = await PhoneNumber.countDocuments({ isAssigned: true });
    
    // Calculate available count using the formula: Available = Total - Assigned
    const availableCount = totalCount - assignedCount;
    
    // Get user statistics
    const users = await User.find({}, { phoneNumbersAssigned: 1, phoneNumbersUsed: 1, isAdmin: 1 });
    
    // Calculate total used count (sum of all users' phoneNumbersUsed)
    const usedCount = users.reduce((sum, user) => sum + (user.phoneNumbersUsed || 0), 0);
    
    // Get user count (excluding admins)
    const userCount = users.filter(user => !user.isAdmin).length;
    
    // Log for debugging
    console.log('Database phone numbers stats:', {
      availablePhoneNumbers: availableCount,
      totalPhoneNumbers: totalCount,
      assignedPhoneNumbers: assignedCount,
      usedPhoneNumbers: usedCount,
      userCount: userCount
    });
    
    res.status(200).json({
      availablePhoneNumbers: availableCount,
      totalPhoneNumbers: totalCount,
      assignedPhoneNumbers: assignedCount,
      usedPhoneNumbers: usedCount,
      userCount: userCount
    });
  } catch (error) {
    console.error('Error in getPhoneNumbersCount:', error);
    res.status(500).json({ message: error.message });
  }
};

// Assign phone numbers to user
const assignPhoneNumbersToUser = async (req, res) => {
  try {
    const { userId, count } = req.body;
    const numCount = parseInt(count);

    if (!userId || !numCount || numCount <= 0) {
      return res.status(400).json({ message: 'Please provide a valid userId and a positive count' });
    }

    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find available phone numbers to assign, fetching only _id for efficiency
    const availablePhoneNumbers = await PhoneNumber.find({ isAssigned: false })
                                                 .limit(numCount)
                                                 .select('_id') // Only fetch the _id
                                                 .lean(); // Use .lean() for faster plain JS objects

    if (availablePhoneNumbers.length < numCount) {
      return res.status(400).json({ message: `Not enough phone numbers available. Only ${availablePhoneNumbers.length} available.` });
    }

    // Extract _ids for the update operation
    const assignedNumberIds = availablePhoneNumbers.map(pn => pn._id);

    // Mark phone numbers as assigned to this user
    // This operation should be relatively fast given it's updating by _id
    await PhoneNumber.updateMany(
      { _id: { $in: assignedNumberIds } },
      { $set: { isAssigned: true, assignedUser: user.userId } }
    );

    // Update user's phone number assignment count
    user.phoneNumbersAssigned += assignedNumberIds.length;
    await user.save(); // This involves a single document save, usually fast.

    res.status(200).json({
      message: `${assignedNumberIds.length} phone numbers assigned to user ${userId}`,
      user: {
        userId: user.userId,
        name: user.name,
        phoneNumbersAssigned: user.phoneNumbersAssigned,
        phoneNumbersUsed: user.phoneNumbersUsed
      }
    });
  } catch (error) {
    console.error('Error assigning phone numbers:', error);
    res.status(500).json({ message: 'Failed to assign phone numbers. ' + error.message });
  }
};

// Create initial admin user
const createAdminUser = async (req, res) => {
  try {
    const adminExists = await User.findOne({ isAdmin: true });
    
    if (adminExists) {
      return res.status(400).json({ message: 'Admin user already exists' });
    }
    
    // Create admin user
    const admin = await User.create({
      userId: '000000', // Default admin ID
      name: 'Admin',
      isAdmin: true
    });
    
    res.status(201).json({
      message: 'Admin user created successfully',
      userId: admin.userId
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clear all phone numbers - Optimized for maximum performance
const clearAllPhoneNumbers = async (req, res) => {
  try {
    // Use db.collection directly for faster operation instead of Mongoose
    const db = PhoneNumber.collection;
    
    // Execute drop collection instead of deleteMany for much faster operation
    // This is significantly faster for large datasets
    await db.drop().catch(() => {
      // If collection doesn't exist, ignore error
      console.log('Collection may not exist yet, continuing...');
    });
    
    // Recreate indexes after drop
    await db.createIndex({ number: 1 }, { unique: true });
    
    // Bulk update users with much faster operation
    await User.updateMany(
      {}, // update all users
      { $set: { phoneNumbersAssigned: 0, phoneNumbersUsed: 0 } },
      { multi: true }
    );
    
    res.status(200).json({
      message: `Successfully cleared all phone numbers and reset user assignments`,
      success: true
    });
  } catch (error) {
    console.error('Error in clearAllPhoneNumbers:', error);
    res.status(500).json({ message: error.message });
  }
};

// Clear all user assignments and make associated phone numbers available
const clearAllUserAssignments = async (req, res) => {
  try {
    // 1. Make all currently assigned phone numbers available again
    const phoneUpdateResult = await PhoneNumber.updateMany(
      { isAssigned: true }, // Find all phone numbers currently marked as assigned
      { $set: { isAssigned: false, assignedUser: null } } // Mark them as unassigned
    );

    // 2. Reset all user assignment and usage counts
    // We update all users, not just those with phoneNumbersAssigned > 0, to ensure consistency
    const userUpdateResult = await User.updateMany(
      {}, // All users
      { $set: { phoneNumbersAssigned: 0, phoneNumbersUsed: 0 } }
    );

    let message = `Successfully made ${phoneUpdateResult.modifiedCount} phone numbers available. `;
    message += `Assignment counts reset for ${userUpdateResult.modifiedCount} users.`;

    if (phoneUpdateResult.modifiedCount === 0 && userUpdateResult.modifiedCount === 0) {
      // This condition might be met if no numbers were assigned AND no user counts needed resetting.
      // Or if no numbers were assigned in the PhoneNumber collection in the first place.
      message = 'No phone numbers were marked as assigned, and no user assignment counts needed clearing.';
    } else if (phoneUpdateResult.modifiedCount === 0) {
        message = `No phone numbers were found marked as assigned to make available. Assignment counts reset for ${userUpdateResult.modifiedCount} users.`;
    } else if (userUpdateResult.modifiedCount === 0) {
        message = `Successfully made ${phoneUpdateResult.modifiedCount} phone numbers available. No user assignment counts needed clearing.`;
    }

    res.status(200).json({
      message: message,
      phoneNumbersMadeAvailable: phoneUpdateResult.modifiedCount,
      usersReset: userUpdateResult.modifiedCount,
      success: true
    });

  } catch (error) {
    console.error('Error in clearAllUserAssignments:', error);
    res.status(500).json({ message: 'Failed to clear user assignments and make numbers available. ' + error.message });
  }
};

// Bulk create users from Excel/CSV file
const bulkCreateUsers = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let users = [];

    // Process file based on extension
    if (fileExtension === '.csv' || fileExtension === '.xlsx' || fileExtension === '.xls') {
      // Read workbook
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: ["userId", "name"] });
      
      // Skip header row if present
      const startIndex = (data[0].userId === 'userId' || data[0].userId === 'ID') ? 1 : 0;
      
      // Prepare user data
      for (let i = startIndex; i < data.length; i++) {
        const row = data[i];
        // Validate user ID (must be 6 digits)
        if (!row.userId || !row.name || !(/^\d{6}$/.test(row.userId.toString()))) {
          continue; // Skip invalid entries
        }
        
        users.push({
          userId: row.userId.toString(),
          name: row.name.toString(),
          phoneNumbersAssigned: 0,
          phoneNumbersUsed: 0
        });
      }
    } else {
      // Clean up file
      fs.unlinkSync(filePath);
      return res.status(400).json({ message: 'Unsupported file format. Please upload CSV, XLS, or XLSX file' });
    }
    
    // Clean up file
    fs.unlinkSync(filePath);
    
    if (users.length === 0) {
      return res.status(400).json({ message: 'No valid user data found in file' });
    }
    
    // Check for duplicate userIds within the file
    const userIds = users.map(user => user.userId);
    const uniqueUserIds = [...new Set(userIds)];
    if (uniqueUserIds.length !== users.length) {
      return res.status(400).json({ message: 'File contains duplicate user IDs' });
    }
    
    // Find existing users to avoid duplicates
    const existingUsers = await User.find({ userId: { $in: userIds } }).select('userId').lean();
    const existingUserIds = existingUsers.map(user => user.userId);
    
    // Filter out users that already exist
    const newUsers = users.filter(user => !existingUserIds.includes(user.userId));
    
    if (newUsers.length === 0) {
      return res.status(400).json({ message: 'All users in the file already exist in the database' });
    }
    
    // Bulk insert new users
    const result = await User.insertMany(newUsers, { ordered: false });
    
    res.status(201).json({
      message: `Successfully added ${result.length} users`,
      totalInFile: users.length,
      skippedExisting: users.length - newUsers.length,
      success: true
    });
  } catch (error) {
    console.error('Error in bulkCreateUsers:', error);
    
    // Handle duplicate key error more gracefully
    if (error.name === 'BulkWriteError' && error.code === 11000) {
      return res.status(400).json({ 
        message: 'Some users were not added due to duplicate user IDs',
        error: error.message
      });
    }
    
    res.status(500).json({ message: error.message });
  }
};

// One-time script to reconcile phone number assignments
const reconcilePhoneNumberAssignments = async (req, res) => {
  try {
    const users = await User.find({ phoneNumbersAssigned: { $gt: 0 } });
    let totalReconciledCount = 0;
    let errors = [];

    for (const user of users) {
      const numbersToAssignCount = user.phoneNumbersAssigned; // How many numbers this user *thinks* they have
      if (numbersToAssignCount <= 0) continue;

      // Find currently assigned numbers for this user to avoid re-assigning already reconciled ones
      const alreadyAssignedToUserCount = await PhoneNumber.countDocuments({ assignedUser: user.userId, isAssigned: true });
      
      let neededToMarkAsAssigned = numbersToAssignCount - alreadyAssignedToUserCount;
      
      if (neededToMarkAsAssigned <= 0) {
        console.log(`User ${user.userId} already has ${alreadyAssignedToUserCount} numbers marked as assigned. No reconciliation needed for this user.`);
        continue;
      }

      // Find available phone numbers to mark as assigned for this user
      const availablePhoneNumbers = await PhoneNumber.find({ isAssigned: false }).limit(neededToMarkAsAssigned);

      if (availablePhoneNumbers.length < neededToMarkAsAssigned) {
        errors.push(`User ${user.userId}: Expected to assign ${neededToMarkAsAssigned} more numbers, but only ${availablePhoneNumbers.length} were available in the general pool.`);
        // Assign what's available if any
        neededToMarkAsAssigned = availablePhoneNumbers.length;
        if (neededToMarkAsAssigned === 0) continue;
      }
      
      const assignedNumberIds = availablePhoneNumbers.slice(0, neededToMarkAsAssigned).map(pn => pn._id);

      if (assignedNumberIds.length > 0) {
        await PhoneNumber.updateMany(
          { _id: { $in: assignedNumberIds } },
          { $set: { isAssigned: true, assignedUser: user.userId } }
        );
        totalReconciledCount += assignedNumberIds.length;
        console.log(`Reconciled ${assignedNumberIds.length} numbers for user ${user.userId}`);
      }
    }

    if (errors.length > 0) {
      return res.status(207).json({
        message: `Reconciliation partially completed. Total ${totalReconciledCount} phone numbers had their isAssigned flag updated. Some issues encountered.`,
        issues: errors,
        totalReconciled: totalReconciledCount
      });
    }

    res.status(200).json({
      message: `Reconciliation complete. Total ${totalReconciledCount} phone numbers had their isAssigned flag updated. Run getPhoneNumbersCount again to see updated stats.`,
      totalReconciled: totalReconciledCount
    });

  } catch (error) {
    console.error('Error reconciling phone number assignments:', error);
    res.status(500).json({ message: 'Failed to reconcile assignments. ' + error.message });
  }
};

// Unassign all phone numbers and reset user counts
const unassignAllPhoneNumbersAndResetUsers = async (req, res) => {
  try {
    // 1. Unassign all phone numbers
    const phoneUpdateResult = await PhoneNumber.updateMany(
      { isAssigned: true }, // Only update those that are currently assigned
      { $set: { isAssigned: false, assignedUser: null } }
    );

    // 2. Reset all user assignment and usage counts
    const userUpdateResult = await User.updateMany(
      {}, // All users
      { $set: { phoneNumbersAssigned: 0, phoneNumbersUsed: 0 } }
    );

    res.status(200).json({
      message: `Successfully unassigned ${phoneUpdateResult.modifiedCount} phone numbers and reset counts for ${userUpdateResult.modifiedCount} users.`,
      phoneNumbersUnassigned: phoneUpdateResult.modifiedCount,
      usersReset: userUpdateResult.modifiedCount
    });

  } catch (error) {
    console.error('Error unassigning all phone numbers and resetting users:', error);
    res.status(500).json({ message: 'Failed to unassign all phone numbers. ' + error.message });
  }
};

// Bulk Assign phone numbers to all non-admin users
const bulkAssignPhoneNumbersToAllUsers = async (req, res) => {
  const { countPerUser } = req.body;
  const numCountPerUser = parseInt(countPerUser);

  if (!numCountPerUser || numCountPerUser <= 0) {
    return res.status(400).json({ message: 'Please provide a valid positive countPerUser' });
  }

  try {
    const regularUsers = await User.find({ isAdmin: false });
    if (regularUsers.length === 0) {
      return res.status(200).json({ message: 'No regular users found to assign numbers to.', totalUsersProcessed: 0, totalNumbersAssigned: 0 });
    }

    let totalNumbersSuccessfullyAssigned = 0;
    let usersSuccessfullyProcessed = 0;
    let usersFailed = 0;
    const BATCH_SIZE_USERS = 50; // Process users in batches to avoid holding too many numbers in memory at once

    for (let i = 0; i < regularUsers.length; i += BATCH_SIZE_USERS) {
      const userBatch = regularUsers.slice(i, i + BATCH_SIZE_USERS);
      
      for (const user of userBatch) {
        try {
          // Check available numbers before attempting to assign for this specific user
          const availablePhoneNumbersForUser = await PhoneNumber.find({ isAssigned: false })
                                                            .limit(numCountPerUser)
                                                            .select('_id')
                                                            .lean();

          if (availablePhoneNumbersForUser.length < numCountPerUser) {
            console.warn(`User ${user.userId}: Not enough numbers (${availablePhoneNumbersForUser.length}) to assign ${numCountPerUser}. Assigning what's available.`);
            if (availablePhoneNumbersForUser.length === 0) {
                usersFailed++;
                continue; // Skip if no numbers at all for this user
            }
          }
          
          const numbersToAssignToThisUser = availablePhoneNumbersForUser.slice(0, numCountPerUser); // Ensure we don't try to assign more than available
          const assignedIdsForThisUser = numbersToAssignToThisUser.map(pn => pn._id);

          if (assignedIdsForThisUser.length > 0) {
            await PhoneNumber.updateMany(
              { _id: { $in: assignedIdsForThisUser } },
              { $set: { isAssigned: true, assignedUser: user.userId } }
            );
            user.phoneNumbersAssigned += assignedIdsForThisUser.length;
            await user.save();
            totalNumbersSuccessfullyAssigned += assignedIdsForThisUser.length;
          }
          usersSuccessfullyProcessed++;
        } catch (err) {
          usersFailed++;
          console.error(`Failed to assign numbers to user ${user.userId} during bulk operation:`, err.message);
        }
      }
    }

    res.status(200).json({
      message: `Bulk assignment attempted. Assigned ${totalNumbersSuccessfullyAssigned} numbers to ${usersSuccessfullyProcessed} users. ${usersFailed} users failed or had insufficient numbers.`,
      totalUsersProcessed: usersSuccessfullyProcessed,
      totalNumbersAssigned: totalNumbersSuccessfullyAssigned,
      usersFailed: usersFailed
    });

  } catch (error) {
    console.error('Error in bulkAssignPhoneNumbersToAllUsers:', error);
    res.status(500).json({ message: 'Overall error in bulk assignment process: ' + error.message });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't allow deleting admin users
    if (user.isAdmin) {
      return res.status(400).json({ message: 'Admin users cannot be deleted' });
    }
    
    // Unassign all phone numbers assigned to this user
    await PhoneNumber.updateMany(
      { assignedUser: userId },
      { $set: { isAssigned: false, assignedUser: null } }
    );
    
    // Delete the user
    await User.deleteOne({ userId });
    
    res.status(200).json({ 
      message: `User ${userId} has been deleted successfully`,
      deletedUserId: userId 
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
};

// Delete multiple users
const deleteMultipleUsers = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Please provide an array of user IDs' });
    }
    
    // Find users
    const users = await User.find({ userId: { $in: userIds } });
    if (users.length === 0) {
      return res.status(404).json({ message: 'No users found' });
    }
    
    // Check if trying to delete admin users
    const adminUsers = users.filter(user => user.isAdmin);
    if (adminUsers.length > 0) {
      return res.status(400).json({ 
        message: 'Admin users cannot be deleted',
        adminUserIds: adminUsers.map(user => user.userId)
      });
    }
    
    // Unassign all phone numbers assigned to these users
    await PhoneNumber.updateMany(
      { assignedUser: { $in: userIds } },
      { $set: { isAssigned: false, assignedUser: null } }
    );
    
    // Delete the users
    const result = await User.deleteMany({ userId: { $in: userIds } });
    
    res.status(200).json({
      message: `${result.deletedCount} users have been deleted successfully`,
      deletedCount: result.deletedCount,
      deletedUserIds: userIds
    });
  } catch (error) {
    console.error('Error deleting multiple users:', error);
    res.status(500).json({ message: error.message });
  }
};

// Clear used phone numbers by resetting user's phoneNumbersUsed count
const clearUsedPhoneNumbers = async (req, res) => {
  try {
    // Find all users with phoneNumbersUsed > 0
    const users = await User.find({ phoneNumbersUsed: { $gt: 0 } });
    
    if (users.length === 0) {
      return res.status(200).json({
        message: 'No users with used phone numbers found.',
        success: true
      });
    }
    
    // Reset the phoneNumbersUsed count for all users
    const updateResult = await User.updateMany(
      { phoneNumbersUsed: { $gt: 0 } },
      { $set: { phoneNumbersUsed: 0 } }
    );
    
    res.status(200).json({
      message: `Successfully reset used phone numbers count for ${updateResult.modifiedCount} users.`,
      usersReset: updateResult.modifiedCount,
      success: true
    });
  } catch (error) {
    console.error('Error in clearUsedPhoneNumbers:', error);
    res.status(500).json({ message: 'Failed to clear used phone numbers: ' + error.message });
  }
};

// Clear assigned phone numbers by marking them as unassigned
const clearAssignedPhoneNumbers = async (req, res) => {
  try {
    // Find all phone numbers marked as assigned
    const assignedNumbers = await PhoneNumber.find({ isAssigned: true });
    
    if (assignedNumbers.length === 0) {
      return res.status(200).json({
        message: 'No assigned phone numbers found.',
        success: true
      });
    }
    
    // Mark all assigned phone numbers as unassigned
    const updateResult = await PhoneNumber.updateMany(
      { isAssigned: true },
      { $set: { isAssigned: false, assignedUser: null } }
    );
    
    // Reset the phoneNumbersAssigned count for all users
    await User.updateMany(
      { phoneNumbersAssigned: { $gt: 0 } },
      { $set: { phoneNumbersAssigned: 0, phoneNumbersUsed: 0 } }
    );
    
    res.status(200).json({
      message: `Successfully unassigned ${updateResult.modifiedCount} phone numbers.`,
      numbersUnassigned: updateResult.modifiedCount,
      success: true
    });
  } catch (error) {
    console.error('Error in clearAssignedPhoneNumbers:', error);
    res.status(500).json({ message: 'Failed to clear assigned phone numbers: ' + error.message });
  }
};

// Clear total phone numbers by dropping the collection (same as clearAllPhoneNumbers)
const clearTotalPhoneNumbers = async (req, res) => {
  try {
    // Use db.collection directly for faster operation
    const db = PhoneNumber.collection;
    
    // Execute drop collection
    await db.drop().catch(() => {
      console.log('Collection may not exist yet, continuing...');
    });
    
    // Recreate indexes
    await db.createIndex({ number: 1 }, { unique: true });
    
    // Reset all user counts
    await User.updateMany(
      {},
      { $set: { phoneNumbersAssigned: 0, phoneNumbersUsed: 0 } }
    );
    
    res.status(200).json({
      message: `Successfully cleared all phone numbers from the database.`,
      success: true
    });
  } catch (error) {
    console.error('Error in clearTotalPhoneNumbers:', error);
    res.status(500).json({ message: 'Failed to clear total phone numbers: ' + error.message });
  }
};

// Export unused phone numbers 
const exportUnusedPhoneNumbers = async (req, res) => {
  try {
    // Find all phone numbers that are not assigned and not used
    const unusedPhoneNumbers = await PhoneNumber.find({ isAssigned: false })
      .select('number -_id')
      .lean();
    
    if (unusedPhoneNumbers.length === 0) {
      return res.status(404).json({ message: 'No unused phone numbers found' });
    }
    
    // Extract just the phone number strings from the result
    const phoneNumbersData = unusedPhoneNumbers.map(item => item.number);
    
    res.status(200).json({
      count: phoneNumbersData.length,
      phoneNumbers: phoneNumbersData
    });
  } catch (error) {
    console.error('Error exporting unused phone numbers:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  uploadPhoneNumbers,
  getPhoneNumbers,
  getPhoneNumbersCount,
  assignPhoneNumbersToUser,
  createAdminUser,
  clearAllPhoneNumbers,
  clearAllUserAssignments,
  bulkCreateUsers,
  reconcilePhoneNumberAssignments,
  unassignAllPhoneNumbersAndResetUsers,
  bulkAssignPhoneNumbersToAllUsers,
  deleteUser,
  deleteMultipleUsers,
  clearUsedPhoneNumbers,
  clearAssignedPhoneNumbers,
  clearTotalPhoneNumbers,
  exportUnusedPhoneNumbers
}; 