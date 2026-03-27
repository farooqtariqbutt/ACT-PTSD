
import { User,Clinic } from '../db/schema.js';

export const getAllUsers = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const skip = (page - 1) * limit;
  
      // 1. Get the current user's ID from the token payload
      // Note: If your JWT payload uses '_id' instead of 'id', change this to req.user._id
      const currentUserId = req.user.id; 
  
      // 2. Create a filter that excludes the current user
      const queryFilter = { _id: { $ne: currentUserId } };
  
      // 3. Apply the filter to BOTH queries
      const [users, totalCount] = await Promise.all([
        User.find(queryFilter) // <-- Applied here
          .select('-password -__v')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        User.countDocuments(queryFilter) // <-- And applied here so the total math is correct!
      ]);
  
      res.status(200).json({
        success: true,
        data: users,
        meta: {
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        }
      });
  
    } catch (error) {
      console.error('[User Controller Error]:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users from the database.'
      });
    }
  };

  export const getAllClinics = async (req, res) => {
    try {
      // 1. Setup Pagination (Defaults: page 1, limit 10)
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10; 
      const skip = (page - 1) * limit;
  
      // 2. Fetch clinics and total count concurrently
      const [clinics, totalCount] = await Promise.all([
        Clinic.find({})
          .select('-__v') // Exclude Mongoose version key, add any other hidden fields here
          .sort({ createdAt: -1 }) // Newest clinics first
          .skip(skip)
          .limit(limit)
          .lean(),
        Clinic.countDocuments({})
      ]);
  
      // 3. Send the response in the exact same format as the users API
      res.status(200).json({
        success: true,
        data: clinics,
        meta: {
          totalCount,
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
        }
      });
  
    } catch (error) {
      console.error('[Clinic Controller Error]:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch clinics from the database.'
      });
    }
  };