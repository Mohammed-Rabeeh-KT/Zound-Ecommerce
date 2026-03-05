import User from '../../models/userSchema.js';
import bcrypt from 'bcrypt';

async function authenticateAdmin(email, password) {
    if (!email || !password) {
        return { error: 'All fields are required' };
    }

    const admin = await User.findOne({ email });

    if (!admin) {
        return { error: "Invalid email or password" };
    }

    if (admin.role !== 'admin') {
        return { error: "Access denied. Not an admin." };
    }

    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
        return { error: "Invalid email or password" };
    }

    return {
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
        }
    };
}

export default {
    authenticateAdmin
};
