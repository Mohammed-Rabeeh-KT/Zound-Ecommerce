import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import offerController from "../admin/offerManagementController.js";
import { catchAsync } from "../../utils/catchAsync.js";
import AppError from "../../utils/AppError.js";
import { STATUS, MESSAGE } from "../../utils/response.js";

const getProductListing = catchAsync(async (req, res, next) => {

    const page = parseInt(req.query.page) || 1;
    const limit = 9; // products per page
    const skip = (page - 1) * limit;

    const {
        search,
        brand,
        category,
        minPrice,
        maxPrice,
        sort = "newest"
    } = req.query;


    //Fetch filter data
    const [allCategories, allBrands] = await Promise.all([
        Category.find({ isListed: true }),
        Brand.find({ isListed: true })
    ]);


    //Base filter
    let filter = {
        status: "Active",
        isDeleted: false,
        variants: {
            $elemMatch: {
                status: "Active",
                stock: { $gt: 0 }
            }
        }
    };

    if (search) {
        filter.productName = { $regex: search, $options: 'i' };
    }

    if (brand) {

        const brandSlugs = brand.split(',');

        const matchedBrands = await Brand.find({
            slug: { $in: brandSlugs },
            isListed: true
        }).select('_id slug')

        const brandIds = matchedBrands.map(b => b._id);

        filter.brand = { $in: brandIds };
    }

    let invalidCategoryFilter = false;

    if (category) {
        const categorySlugs = category.split(',');

        const matchedCategories = await Category.find({
            slug: { $in: categorySlugs },
            isListed: true
        }).select('_id slug isListed');

        const activeCategories = matchedCategories.filter(c => c.isListed);

        if (activeCategories.length === 0) {
            invalidCategoryFilter = true;
        } else {
            filter.category = { $in: activeCategories.map(c => c._id) };
        }
    }

    if (invalidCategoryFilter) {
        return res.redirect('/user/products');
    }

    // Dynamic Heading Logic
    let pageTitle = "All Products";
    let pageDescription = "Explore our premium collection of audio products engineered for exceptional sound.";

    if (category && !category.includes(',')) {
        const selectedCategory = await Category.findOne({
            slug: category,
            isListed: true
        });

        if (selectedCategory) {
            pageTitle = selectedCategory.name;
            pageDescription =
                selectedCategory.description ||
                "Discover premium products in this category.";
        }
    }

    //Price range

    if (minPrice || maxPrice) {
        filter["variants.salePrice"] = {
            ...(minPrice && { $gte: Number(minPrice) }),
            ...(maxPrice && { $lte: Number(maxPrice) })
        };
    }

    //sorting
    let sortOrder = { createdAt: -1 }; // newest (default)

    if (sort === "price-low") sortOrder = { "variants.salePrice": 1 };
    if (sort === "price-high") sortOrder = { "variants.salePrice": -1 };
    if (sort === "name-asc") sortOrder = { productName: 1 };
    if (sort === "name-desc") sortOrder = { productName: -1 };



    const totalProducts = await Product.countDocuments(filter);

    const products = await Product.find(filter)
        .populate('brand')
        .populate('category')
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)

    const processedProducts = await Promise.all(products.map(async product => {
        // Filter active and in-stock variants
        let validVariants = product.variants.filter(v => v.status === "Active" && v.stock > 0);

        // If no in-stock variants, try to find any active variant to show price (even if OOS)
        if (validVariants.length === 0) {
            validVariants = product.variants.filter(v => v.status === "Active");
        }

        // Sort variants based on user preference to show consistent price
        if (validVariants.length > 1) {
            if (sort === "price-low") {
                validVariants.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
            } else if (sort === "price-high") {
                validVariants.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
            } else {
                // Default to lowest price (Starting At concept)
                validVariants.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
            }
        }

        const activeVariant = validVariants[0] || product.variants[0]; // Fallback to first variant if absolutely nothing valid

        // Find index of activeVariant in the original variants array
        const variantIndex = product.variants.findIndex(v => v._id && activeVariant._id && v._id.toString() === activeVariant._id.toString());

        // Calculate offer for this product
        const offerData = await offerController.calculateOfferPrice(product, variantIndex >= 0 ? variantIndex : 0);



        return {
            ...product.toObject(),

            //Image priority : 
            //1. active variant image
            //2. commom img 
            //3. placeholder
            listingImage:
                activeVariant?.images?.[0] ||
                product.productImages?.[0] ||
                '/images/placeholder.png',
            primaryVariant: activeVariant,
            offer: offerData
        }
    }));

    const totalPages = Math.ceil(totalProducts / limit);

    if (req.xhr) {
        return res.json({
            products: processedProducts,
            currentPage: page,
            totalPages
        });
    }

    res.render("user/productListing", {
        allCategories,
        allBrands,
        pageTitle,
        pageDescription,
        products: processedProducts,
        totalProducts,
        searchQuery: search || '',
        sortBy: sort || 'newest',
        selectedFilters: req.query,
        currentPage: page,
        totalPages
    });
})

const getProductDetails = catchAsync(async (req, res, next) => {
    const productSlug = req.params.slug;

    const product = await Product.findOne({
        slug: productSlug,
        status: 'Active',
        isDeleted: false
    })
        .populate('brand')
        .populate('category');

    if (
        !product ||
        product.isDeleted ||
        product.status !== 'Active' ||
        !product.category ||
        !product.category.isListed
    ) {
        return res.status(404).render("user/productUnavailable", {
            title: "Product Unavailable",
            message: "This item is no longer available."
        });
    }


    const activeVariants = product.variants.filter(v => v.status === 'Active' && v.stock > 0);

    // Sort variants by price ascending to default to the cheapest option
    activeVariants.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));

    if (activeVariants.length === 0) {
        return res.status(404).render("user/productUnavailable", {
            title: "Out of Stock",
            message: "This product is currently out of stock."
        });
    }

    const relatedProductsRaw = await Product.find({
        category: product.category._id,
        _id: { $ne: product._id },
        status: 'Active',
        isDeleted: false,
        variants: {
            $elemMatch: {
                status: "Active",
                stock: { $gt: 0 }
            }
        }
    })
        .limit(4)
        .populate('brand')
        .lean();

    const relatedProducts = relatedProductsRaw.map(prod => {
        const activeVariant = prod.variants.find(
            v => v.status === 'Active' && v.stock > 0
        );

        return {
            ...prod,
            listingImage:
                activeVariant?.images?.[0] ||
                prod.productImages?.[0] ||
                '/images/placeholder.png',
            primaryVariant: activeVariant
        };
    });

    const activeVariantsWithOffers = await Promise.all(activeVariants.map(async (variant) => {
        // Find existing index to get original price reference if needed, or just use variant data
        const originalIndex = product.variants.findIndex(v => v._id.toString() === variant._id.toString());

        // Calculate offer for this specific variant
        const offer = await offerController.calculateOfferPrice(product, originalIndex >= 0 ? originalIndex : 0);

        return {
            ...variant.toObject(),
            offer
        };
    }));



    res.render('user/productDetails', {
        product: {
            ...product.toObject(),
            variants: activeVariantsWithOffers,
            offer: activeVariantsWithOffers[0]?.offer
        },
        relatedProducts,
        firstVariant: activeVariantsWithOffers[0],
        pageTitle: `${product.productName} - ZOUND`,
        searchQuery: "",
        selectedFilters: {}
    })
})


export default {
    getProductListing,
    getProductDetails
}


