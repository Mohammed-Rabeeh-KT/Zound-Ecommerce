import Brand from '../../models/brandSchema.js';
import Product from '../../models/productSchema.js';

const getBrandsData = async () => {
    const brands = await Brand.find({ isListed: true }).lean();

    const productCounts = await Product.aggregate([
        {
            $match: {
                isDeleted: false,
                isListed: true
            }
        },
        {
            $group: {
                _id: "$brand",
                count: { $sum: 1 }
            }
        }
    ]);

    const enrichedBrands = brands.map(brand => {
        const found = productCounts.find(
            item => item._id.toString() === brand._id.toString()
        );

        return {
            ...brand,
            productCount: found ? found.count : 0
        };
    });

    enrichedBrands.sort((a, b) => b.productCount - a.productCount);

    const featuredBrands = enrichedBrands.slice(0, 3);
    const regularBrands = enrichedBrands;

    return {
        featuredBrands,
        regularBrands
    };
};

export default { getBrandsData };
