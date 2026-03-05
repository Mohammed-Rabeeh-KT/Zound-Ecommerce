import paymentService from "../../../services/admin/paymentService.js";

const getPaymentPage = async (req, res) => {
    const data = await paymentService.getPaymentPageData(req.query.page);

        res.render("admin/paymentManagement", {
            ...data,
            currentPage: 'payments',
            adminName: req.session.admin?.name
        });
};

const getRefundPage = async (req, res) => {
    const { page, search, status, export: exportType } = req.query;

        const data = await paymentService.getRefundPageData(page, search, status, exportType);

        if (data.isCsv) {
            res.header('Content-Type', 'text/csv');
            res.attachment(`refunds-export-${Date.now()}.csv`);
            return res.send(data.csvData);
        }

        res.render("admin/refundManagement", {
            ...data,
            currentPage: 'payments',
            adminName: req.session.admin?.name
        });
};

export default {
    getPaymentPage,
    getRefundPage
};
