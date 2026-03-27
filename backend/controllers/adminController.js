import { User, Clinic } from '../db/schema.js';

export const getClinicTherapists = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const adminClinicId = req.user.id || req.user._id;

    const queryFilter = { 
        clinicId: adminClinicId, 
        role: 'THERAPIST'        
    };

    // 1. Fetch therapists and total count
    const [therapists, totalCount] = await Promise.all([
      User.find(queryFilter)
        .select('-password -__v')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(queryFilter)
    ]);

    // 2. NEW: Calculate workload for each therapist in the table
    const therapistsWithWorkload = await Promise.all(therapists.map(async (therapist) => {
      const clientCount = await User.countDocuments({
        assignedtherapistId: therapist.assignedTherapistId, // Matching your schema
        role: 'CLIENT'                     // Change to 'CLIENT' if needed!
      });

      // Set a max capacity (you can pull this from therapist.maxCapacity if it exists in your DB)
      const capacity = therapist.maxCapacity || 30;

      return {
        ...therapist,
        currentClientsCount: clientCount,
        maxCapacity: capacity,
        // Automatically flag them if they are full!
        status: clientCount >= capacity ? 'Oversubscribed' : (therapist.status || 'Active')
      };
    }));

    // 3. Send response with the new 'therapistsWithWorkload' array
    res.status(200).json({
      success: true,
      data: therapistsWithWorkload, 
      meta: {
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      }
    });

  } catch (error) {
    console.error('[Admin Controller Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch clinic therapists from the database.'
    });
  }
};
export const getClinicDashboardStats = async (req, res) => {
  try {
    // The admin's ID is the clinicId
    const adminClinicId = req.user.id || req.user._id;

    // 1. Get total patients and therapists for this clinic from the User collection
    // Note: If your schema uses 'CLIENT' instead of 'PATIENT' for the role, change it below!
    const [totalPatients, totalTherapists] = await Promise.all([
      User.countDocuments({ clinicId: adminClinicId, role: 'CLIENT' }), 
      User.countDocuments({ clinicId: adminClinicId, role: 'THERAPIST' })
    ]);

    // 2. Fetch all therapists for this clinic
    const therapists = await User.find({ 
      clinicId: adminClinicId, 
      role: 'THERAPIST' 
    }).select('name _id').lean();

    const colors = ['bg-indigo-500', 'bg-rose-500', 'bg-emerald-500', 'bg-amber-500', 'bg-sky-500'];
    
    // 3. Get the patient count for each therapist using your exact schema field
    const workload = await Promise.all(therapists.map(async (therapist, index) => {
      
      const clientCount = await User.countDocuments({
        assignedtherapistId: therapist.assignedTherapistId, // <-- Updated to match your schema!
        role: 'CLIENT'                     // <-- Change to 'CLIENT' if needed
      });

      // Calculate a percentage capacity (assuming 30 clients is 100% capacity)
      const MAX_CAPACITY = 30; 
      const loadPercentage = Math.round((clientCount / MAX_CAPACITY) * 100);

      return {
        name: therapist.name,
        count: clientCount,
        load: loadPercentage > 100 ? 100 : loadPercentage,
        color: colors[index % colors.length] 
      };
    }));

    // 4. Send the correct data back to the React frontend
    res.status(200).json({
      success: true,
      data: {
        totalPatients,
        totalTherapists,
        workload
      }
    });

  } catch (error) {
    console.error('[Dashboard Stats Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard stats' });
  }
};