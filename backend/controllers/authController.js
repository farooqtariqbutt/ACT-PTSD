import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, Clinic } from "../db/schema.js"; // Import the User model
import { sendWelcomeWithMFAEmail,sendMFAEmail,sendPasswordResetEmail } from "../utils/sendEmail.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Register a new user
 */

const generateMfaCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const findByEmail = (email) => ({ email: { $regex: new RegExp(`^${email}$`, "i") } });
const findClinicByEmail = (email) => ({ contactEmail: { $regex: new RegExp(`^${email}$`, "i") } });

export const register = async (req, res) => {
  try {
    const { name, password, role, license, clinicId } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    // Check if the user already exists
    const existingUser = await User.findOne(findByEmail(email));
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    let finalClinicId = clinicId?.trim() || null;
    let assignedTherapistId = null;

    if (role === "CLIENT") {
      if (!finalClinicId) {
        // SCENARIO A: No clinicId provided. Find the default/only therapist.
        const defaultTherapist = await User.findOne({ role: "THERAPIST" });

        if (defaultTherapist) {
          finalClinicId = defaultTherapist.clinicId;
          assignedTherapistId = defaultTherapist._id;
        }
      } else {
        // SCENARIO B: clinicId provided. Verify it exists and belongs to a therapist.
        const therapist = await User.findOne({
          role: "THERAPIST",
          clinicId: finalClinicId,
        });

        if (!therapist) {
          return res.status(400).json({
            message: "Invalid Clinic ID. No therapist found for this clinic.",
          });
        }

        assignedTherapistId = therapist._id;
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const mfaCode = generateMfaCode();

    // Create a new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      license,
      clinicId: finalClinicId,
      assignedTherapistId,
      mfaCode,
    });

    await newUser.save();
    try {
      await sendWelcomeWithMFAEmail(email, name, mfaCode);
    } catch (emailError) {
      console.error("[Email Error] Failed to send welcome/MFA email:", emailError);
    }
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      tempCode: mfaCode,
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        clinicId: newUser.clinicId,
        assignedTherapistId: newUser.assignedTherapistId,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
};

/**
 * Login a user
 */
export const login = async (req, res) => {
  try {
    const { password } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    
    // 1. Check the User collection first
    let account = await User.findOne(findByEmail(email));
    let accountType = 'User';

    // 2. If no User is found, check the Clinic collection
    // Note: Based on your previous React components, clinics use 'contactEmail' instead of 'email'.
    if (!account) {
      account = await Clinic.findOne(findClinicByEmail(email)); 
      accountType = 'Clinic';
    }

    // 3. If NEITHER was found, or the password doesn't match
    if (!account || !(await bcrypt.compare(password, account.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4. Generate MFA code and save it to whichever account type logged in
    const mfaCode = generateMfaCode();
    account.mfaCode = mfaCode; 
    await account.save();

    const targetEmail = accountType === 'Clinic' ? account.contactEmail : account.email;

    try {
      await sendMFAEmail(targetEmail, mfaCode);
    } catch (emailError) {
      console.error("[Email Error] Failed to send MFA code:", emailError);
    }

    // 5. Send the response
    res.status(200).json({
      message: "MFA Required",
      tempCode: mfaCode, // DELETE THIS when you switch to email in production!
      email: targetEmail,
      accountType: accountType // Helpful for your React frontend to know who logged in!
    });
    console.log(mfaCode)

  } catch (error) {
    console.error('[Login Error]:', error);
    res.status(500).json({ message: "Login error" });
  }
};

export const verifyMfa = async (req, res) => {
  try {
    const { code } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    // 1. Check the User collection first
    let account = await User.findOne(findByEmail(email));
    let accountType = 'User';

    // 2. If no User is found, check the Clinic collection
    if (!account) {
      account = await Clinic.findOne(findClinicByEmail(email));
      accountType = 'Clinic';
    }

    // 3. Validate account existence and MFA code
    // Note: I added String(code) just in case your frontend sends the code as an integer!
    if (!account || account.mfaCode !== String(code)) {
      return res.status(401).json({ message: "Invalid MFA code" });
    }

    // 4. Clear code after successful use
    account.mfaCode = null;
    await account.save();

    // 5. Determine the role for the JWT
    // If your Clinic schema doesn't have a 'role' string, we default them to 'SUPER_ADMIN' 
    // so your middleware lets them into the dashboard!
    const accountRole = accountType === 'Clinic' ? (account.role || 'SUPER_ADMIN') : account.role;

    // 6. Generate the JWT
    const token = jwt.sign(
      { 
        id: account._id, 
        role: accountRole 
      },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    // 7. Send successful response
    res.status(200).json({
      token,
      role: accountRole,
      user: {
        _id: account._id,
        name: account.name,
        // Send back contactEmail if it's a clinic, otherwise normal email
        email: accountType === 'Clinic' ? account.contactEmail : account.email,
        role: accountRole,
        accountType: accountType
      },
    });
  } catch (error) {
    console.error('[Verify MFA Error]:', error);
    res.status(500).json({ message: "Verification error" });
  }
};

/**
 * Request a password reset code
 */
export const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    // 1. Check the User collection first
    let account = await User.findOne(findByEmail(email));
    let accountType = "User";

    // 2. If no User is found, check the Clinic collection
    if (!account) {
      account = await Clinic.findOne(findClinicByEmail(email));
      accountType = "Clinic";
    }

    // 3. EXPLICIT CHECK: If no account is found, return an error immediately
    if (!account) {
      return res.status(404).json({ 
        message: "We couldn't find an account associated with that email address." 
      });
    }

    // 4. Generate and save the code
    const mfaCode = generateMfaCode();
    account.mfaCode = mfaCode;
    // Note: If you add an 'mfaCodeExpires' field to your schema in the future, set it here.
    await account.save();

    const targetEmail = accountType === "Clinic" ? account.contactEmail : account.email;

    try {
      await sendPasswordResetEmail(targetEmail, mfaCode);
    } catch (emailError) {
      console.error("[Email Error] Failed to send password reset code:", emailError);
      return res.status(500).json({ message: "Account found, but failed to send the email." });
    }

    res.status(200).json({
      message: "Reset code sent to email",
      tempCode: mfaCode, // Unconditionally send this for now so the frontend alert works
    });
  } catch (error) {
    console.error("[Forgot Password Error]:", error);
    res.status(500).json({ message: "Error processing request", error: error.message });
  }
};

export const verifyResetCode = async (req, res) => {
  try {
    const { code } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    let account = await User.findOne(findByEmail(email));
    if (!account) {
      account = await Clinic.findOne(findClinicByEmail(email));
    }

    // Ensure account exists and code matches exactly
    if (!account || account.mfaCode !== String(code)) {
      return res.status(401).json({ message: "Invalid or expired reset code." });
    }

    // We DO NOT clear the mfaCode here because it is needed one more time
    // in the final `resetPassword` step to authorize the database update.
    
    res.status(200).json({ message: "Code verified successfully." });
  } catch (error) {
    console.error("[Verify Reset Code Error]:", error);
    res.status(500).json({ message: "Verification error", error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { code, newPassword } = req.body;
    const email = req.body.email?.toLowerCase().trim();

    let account = await User.findOne(findByEmail(email));
    if (!account) {
      account = await Clinic.findOne(findClinicByEmail(email));
    }

    // Verify the code one last time for security
    if (!account || account.mfaCode !== String(code)) {
      return res.status(401).json({ message: "Invalid or expired reset code." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    account.password = hashedPassword;

    // Clear the MFA code so it cannot be reused
    account.mfaCode = null;
    await account.save();

    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[Reset Password Error]:", error);
    res.status(500).json({ message: "Error resetting password", error: error.message });
  }
};
