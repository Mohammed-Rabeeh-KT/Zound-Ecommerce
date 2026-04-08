import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";
import Brand from "../../models/brandSchema.js";
import Banner from "../../models/bannerSchema.js";

const getCategoryImage = (catName) => {
    const map = {
        "Headphones": "/images/cat/headphones.png",
        "IEMs": "/images/cat/iems.png",
        "Speaker": "/images/cat/speaker.png",
        "DACs": "/images/cat/dacs.png",
        "Earphones": "/images/cat/earphones.png",
        "Earbuds": "/images/cat/earbuds.png",
        "Hi-Fi Speakers": "/images/cat/hifi-speakers.png",
        "Studio Gear": "/images/cat/studio-gear.png",
        "Wireless Audio": "/images/cat/wireless-audio.png",
        "Accessories": "/images/cat/accessories.png",
        "Gaming Audio": "/images/cat/gaming-audio.png "
    };
    return map[catName] || "/images/cat/accessories.png"; // Default
};



// Process single product
const processProduct = async (product) => {
    let activeVariant = product.variants?.find(
        v => v.status === 'Active' && v.stock > 0
    );

    if (!activeVariant) {
        activeVariant = product.variants?.find(v => v.status === 'Active');
    }

    let offerData = {
        discountAmount: 0,
        finalPrice: activeVariant?.salePrice || 0
    };

    return {
        ...product.toObject(),
        primaryVariant: activeVariant,
        listingImage:
            activeVariant?.images?.[0] ||
            product.productImages?.[0] ||
            "/images/placeholder.png",
        offer: offerData
    };
};

// Main homepage service
const getHomepageData = async () => {
    const categoryData = await Category.find({ isListed: true });
    const categories = categoryData.map(c => ({
        _id: c._id,
        name: c.name,
        slug: c.slug,
        image: getCategoryImage(c.name)
    }));

    const latestProducts = await Product.find({
        isDeleted: false,
        status: "Active"
    })
        .populate("category")
        .populate("brand")
        .sort({ createdAt: -1 })
        .limit(8);

    let topProducts = await Product.find({
        isDeleted: false,
        status: "Active",
        isBestSeller: true
    })
        .populate("category")
        .populate("brand")
        .limit(8);

    if (topProducts.length === 0) {
        topProducts = await Product.find({
            isDeleted: false,
            status: "Active"
        })
            .populate("category")
            .populate("brand")
            .sort({ "variants.stock": -1 })
            .limit(8);
    }

    const latestProductsProcessed = await Promise.all(latestProducts.map(processProduct));
    const topProductsProcessed = await Promise.all(topProducts.map(processProduct));
    const specialOffersProcessed = await Promise.all(latestProducts.map(processProduct));

    const brands = await Brand.find({ isListed: true }).limit(10);

    // Fetch active banners
    const now = new Date();
    const activeBanners = await Banner.find({
        isActive: true,
        startDate: { $lte: now },
        $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gt: now } }
        ]
    }).sort({ order: 1, createdAt: -1 });

    return {
        banners: activeBanners,
        categories,
        latestProducts: latestProductsProcessed,
        topProducts: topProductsProcessed,
        brands,
        specialOffers: specialOffersProcessed
    };
}

export default {
    getHomepageData
}