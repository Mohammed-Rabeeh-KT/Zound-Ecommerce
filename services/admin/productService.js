
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Brand from "../../models/brandSchema.js";
import AppError from "../../utils/AppError.js";
import { STATUS } from "../../utils/response.js";

const escapeRegExp = (str = "") => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const addProduct = async (body, files) => {
    const {
        name,
        productName,
        brand,
        category,
        description,
        status
    } = body;

    console.log('Product service - received data:', { name, productName, brand, category, status });

    if (!brand || !category) {
        throw new AppError("Brand and Category are required", 400);
    }

    const finalProductName = (name || productName || "").trim();
    if (!finalProductName) {
        throw new AppError("Product name is required", 400);
    }

    const duplicateProduct = await Product.findOne({
        productName: { $regex: new RegExp(`^${escapeRegExp(finalProductName)}$`, "i") },
        isDeleted: false
    });
    if (duplicateProduct) {
        throw new AppError(`Product "${finalProductName}" already exists. Please choose a different name.`, STATUS.CONFLICT);
    }

    const [brandExists, categoryExists] = await Promise.all([
        Brand.exists({ _id: brand }),
        Category.exists({ _id: category })
    ]);
    if (!brandExists) throw new AppError("Selected brand not found", STATUS.BAD_REQUEST);
    if (!categoryExists) throw new AppError("Selected category not found", STATUS.BAD_REQUEST);

    const mainImages = (files || []).filter(f => f.fieldname === 'images');
    const variantFiles = (files || []).filter(f => f.fieldname.startsWith('variantImage_'));

    const imagePaths = mainImages.map(file => file.path);
    console.log('Product service - main images count:', mainImages.length);

    if (imagePaths.length < 1) {
        throw new AppError("Please upload at least one product image", STATUS.BAD_REQUEST);
    }

    let parsedFeatures = [];
    if (body['features[]']) {
        parsedFeatures = Array.isArray(body['features[]'])
            ? body['features[]']
            : [body['features[]']];
    } else if (body.features) {
        try {
            parsedFeatures = JSON.parse(body.features);
        } catch (e) {
            console.error('Error parsing features:', e);
            parsedFeatures = [];
        }
    }

    let parsedVariants = [];
    try {
        if (body.variants) {
            parsedVariants = typeof body.variants === 'string'
                ? JSON.parse(body.variants)
                : body.variants;
        }

        if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
            throw new AppError("Please add at least one variant", STATUS.BAD_REQUEST);
        }

        parsedVariants = parsedVariants.map(v => {
            const basePrice = Number(v.basePrice);
            const salePriceRaw = v.salePrice;
            const salePrice = (salePriceRaw === undefined || salePriceRaw === null || String(salePriceRaw).trim() === '')
                ? basePrice
                : Number(salePriceRaw);

            const images = Array.isArray(v.images) ? v.images : [];

            return {
                ...v,
                basePrice,
                salePrice,
                images
            };
        });

        variantFiles.forEach(file => {
            const index = parseInt(file.fieldname.split('_')[1]);
            if (parsedVariants[index]) {
                if (!parsedVariants[index].images) parsedVariants[index].images = [];
                parsedVariants[index].images.push(file.path);
            }
        });

    } catch (e) {
        console.error('Error parsing variants:', e);
        if (e instanceof AppError) throw e;
        throw new AppError("Invalid variants format. Please check variant data.", 400);
    }

    if (parsedFeatures.filter(f => String(f).trim()).length === 0) {
        throw new AppError("Please add at least one product feature", STATUS.BAD_REQUEST);
    }

    for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];

        if (!Number.isFinite(v.basePrice) || v.basePrice <= 0) {
            throw new AppError(`Variant #${i + 1}: Base price is required and must be greater than 0`, STATUS.BAD_REQUEST);
        }
        if (!Number.isFinite(v.salePrice) || v.salePrice < 0) {
            throw new AppError(`Variant #${i + 1}: Selling price must be a valid number`, STATUS.BAD_REQUEST);
        }
        if (v.salePrice > v.basePrice) {
            throw new AppError(`Variant #${i + 1}: Selling price cannot be greater than base price`, STATUS.BAD_REQUEST);
        }

        const imgCount = Array.isArray(v.images) ? v.images.length : 0;
        if (imgCount < 3) {
            throw new AppError(`Variant #${i + 1}: Please upload at least 3 images for each variant`, STATUS.BAD_REQUEST);
        }
    }

    const newProduct = new Product({
        productName: finalProductName,
        brand,
        category,
        description,
        features: parsedFeatures,
        variants: parsedVariants,
        status: status || 'Active',
        productImages: imagePaths
    });

    await newProduct.save();
    console.log('Product created successfully:', newProduct.productName);
    return newProduct;
};

const getProductById = async (productId) => {
    const product = await Product.findById(productId).populate('category').populate('brand');
    if (!product) throw new AppError("Product not found", 404);
    return product;
};

const updateProduct = async (productId, body, files) => {
    const {
        productName,
        brand,
        category,
        description,
        features,
        variants,
        status,
        existingImages
    } = body;

    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found", 404);

    const originalProductImages = Array.isArray(product.productImages) ? [...product.productImages] : [];

    const normalizedName = (productName ?? product.productName ?? "").trim();
    if (!normalizedName) {
        throw new AppError("Product name is required", STATUS.BAD_REQUEST);
    }

    const duplicate = await Product.findOne({
        productName: { $regex: new RegExp(`^${escapeRegExp(normalizedName)}$`, "i") },
        isDeleted: false,
        _id: { $ne: productId }
    });
    if (duplicate) {
        throw new AppError("Product name already taken", STATUS.CONFLICT);
    }

    let mainImages = [];
    let variantFiles = [];
    if (files && files.length > 0) {
        mainImages = files.filter(f => f.fieldname === 'images');
        variantFiles = files.filter(f => f.fieldname.startsWith('variantImage_'));
    }

    let keptImages = [];
    if (existingImages !== undefined) {
        keptImages = Array.isArray(existingImages) ? existingImages : [existingImages];
    } else {
        keptImages = originalProductImages;
    }

    const newImagePaths = mainImages.map(file => file.path);
    const nextProductImages = [...keptImages, ...newImagePaths];
    if (nextProductImages.length < 1) {
        throw new AppError("Please keep/upload at least one product image", STATUS.BAD_REQUEST);
    }

    let parsedVariants = [];
    try {
        parsedVariants = variants ? JSON.parse(variants) : (product.variants || []);
    } catch (e) {
        throw new AppError("Invalid variants format", STATUS.BAD_REQUEST);
    }

    if (!Array.isArray(parsedVariants) || parsedVariants.length === 0) {
        throw new AppError("Please add at least one variant", STATUS.BAD_REQUEST);
    }

    parsedVariants = parsedVariants.map(v => {
        const basePrice = Number(v.basePrice);
        const salePriceRaw = v.salePrice;
        const salePrice = (salePriceRaw === undefined || salePriceRaw === null || String(salePriceRaw).trim() === '')
            ? basePrice
            : Number(salePriceRaw);
        const images = Array.isArray(v.images) ? v.images : [];

        return {
            ...v,
            basePrice,
            salePrice,
            images
        };
    });

    variantFiles.forEach(file => {
        const index = parseInt(file.fieldname.split('_')[1]);
        if (parsedVariants[index]) {
            if (!parsedVariants[index].images) parsedVariants[index].images = [];
            parsedVariants[index].images.push(file.path);
        }
    });

    for (let i = 0; i < parsedVariants.length; i++) {
        const v = parsedVariants[i];
        if (!Number.isFinite(v.basePrice) || v.basePrice <= 0) {
            throw new AppError(`Variant #${i + 1}: Base price is required and must be greater than 0`, STATUS.BAD_REQUEST);
        }
        if (!Number.isFinite(v.salePrice) || v.salePrice < 0) {
            throw new AppError(`Variant #${i + 1}: Selling price must be a valid number`, STATUS.BAD_REQUEST);
        }
        if (v.salePrice > v.basePrice) {
            throw new AppError(`Variant #${i + 1}: Selling price cannot be greater than base price`, STATUS.BAD_REQUEST);
        }
        const imgCount = Array.isArray(v.images) ? v.images.length : 0;
        if (imgCount < 3) {
            throw new AppError(`Variant #${i + 1}: Please keep/upload at least 3 images`, STATUS.BAD_REQUEST);
        }
    }

    let parsedIncomingFeatures = null;
    if (features !== undefined) {
        try {
            parsedIncomingFeatures = JSON.parse(features);
        } catch (e) {
            throw new AppError("Invalid features format", STATUS.BAD_REQUEST);
        }
    }

    const compareVariants = (arr) => (arr || []).map(v => ({
        type: (v.type || '').trim(),
        value: (v.value || '').trim(),
        color: (v.color || '').trim(),
        size: (v.size || '').trim(),
        basePrice: Number(v.basePrice),
        salePrice: Number(v.salePrice),
        stock: Number(v.stock),
        status: (v.status || 'Active').trim(),
        images: Array.isArray(v.images) ? [...v.images].sort() : []
    }));

    const hasNewMainImages = mainImages.length > 0;
    const hasNewVariantImages = variantFiles.length > 0;
    const nextImagesKey = nextProductImages.join('|');
    const baselineImagesKey = originalProductImages.join('|');

    const baselineFeatures = Array.isArray(product.features) ? product.features : [];
    const baselineVariants = Array.isArray(product.variants) ? product.variants : [];

    const noChangesDetected =
        !hasNewMainImages &&
        !hasNewVariantImages &&
        normalizedName === (product.productName || '').trim() &&
        (description === undefined || description === product.description) &&
        (status === undefined || status === product.status) &&
        (brand === undefined || String(brand) === String(product.brand)) &&
        (category === undefined || String(category) === String(product.category)) &&
        (parsedIncomingFeatures === null || JSON.stringify(parsedIncomingFeatures) === JSON.stringify(baselineFeatures)) &&
        JSON.stringify(compareVariants(parsedVariants)) === JSON.stringify(compareVariants(baselineVariants)) &&
        nextImagesKey === baselineImagesKey;

    if (noChangesDetected) {
        throw new AppError("No changes made", STATUS.BAD_REQUEST);
    }

    product.productImages = nextProductImages;
    product.variants = parsedVariants;
    product.productName = normalizedName;

    if (brand !== undefined) {
        const brandExists = await Brand.exists({ _id: brand });
        if (!brandExists) throw new AppError("Brand not found", STATUS.BAD_REQUEST);
        product.brand = brand;
    }
    if (category !== undefined) {
        const categoryExists = await Category.exists({ _id: category });
        if (!categoryExists) throw new AppError("Category not found", STATUS.BAD_REQUEST);
        product.category = category;
    }
    if (description !== undefined) product.description = description;
    if (status !== undefined) product.status = status;
    if (parsedIncomingFeatures !== null) product.features = parsedIncomingFeatures;

    if (!product.features || product.features.filter(f => String(f).trim()).length === 0) {
        throw new AppError("Please add at least one feature", STATUS.BAD_REQUEST);
    }

    try {
        await product.save();
        return product;
    } catch (saveError) {
        console.error("Product save error:", saveError);
        throw new AppError(saveError.message || "Failed to save product", STATUS.INTERNAL_ERROR);
    }
};

const toggleProductStatus = async (productId) => {
    const product = await Product.findById(productId);

    if (!product) {
        throw new AppError('Product not found', 404);
    }

    product.status = product.status === 'Active' ? 'Inactive' : 'Active';
    await product.save();

    return product;
};

const softDeleteProduct = async (productId) => {
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found", 404);

    await Product.findByIdAndUpdate(productId, { isDeleted: true });
    return true;
};

const deleteVariant = async (productId, variantId) => {
    await Product.updateOne({ _id: productId }, { $pull: { variants: { _id: variantId } } });
    return true;
};

const toggleVariantStatus = async (productId, variantId, status) => {
    await Product.updateOne(
        { _id: productId, "variants._id": variantId },
        { $set: { "variants.$.status": status } }
    );
    return true;
};

const getProductPageData = async (queryData) => {
    const page = parseInt(queryData.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const query = { isDeleted: false };
    if (queryData.search) {
        query.productName = { $regex: queryData.search, $options: "i" };
    }
    if (queryData.category) {
        query.category = queryData.category;
    }
    if (queryData.status) {
        query.status = queryData.status === 'active' ? 'Active' : 'Inactive';
    }

    const totalProducts = await Product.countDocuments(query);
    const products = await Product.find(query)
        .populate('category')
        .populate('brand')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });

    return {
        products,
        categories,
        brands,
        totalPages: Math.ceil(totalProducts / limit),
        currentPageNum: page,
        filters: queryData
    };
};

const getProductDetailsPageData = async (productId) => {
    const product = await Product.findById(productId)
        .populate('category')
        .populate('brand');

    if (!product) {
        throw new AppError("Product not found", 404);
    }

    const categories = await Category.find({ isListed: true });
    const brands = await Brand.find({ isListed: true });

    return { product, categories, brands };
};

export default {
    addProduct,
    getProductById,
    updateProduct,
    toggleProductStatus,
    softDeleteProduct,
    deleteVariant,
    toggleVariantStatus,
    getProductPageData,
    getProductDetailsPageData
};
