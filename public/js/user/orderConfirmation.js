async function retryPayment(orderId, finalAmount, userPhone) {
    try {
        const response = await axios.post('/api/user/payment/create-order', {
            amount: finalAmount,
            orderId: orderId
        });

        if (response.data.success) {
            const { razorpayOrderId, keyId, amount, currency } = response.data.data;

            const options = {
                "key": keyId,
                "amount": amount,
                "currency": currency,
                "name": "ZOUND",
                "description": `Retry Payment for Order #${response.data.data.receipt || orderId}`,
                "order_id": razorpayOrderId,
                "handler": async function (response) {
                    // Verify Payment
                    const verifyRes = await axios.post('/api/user/payment/verify', {
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_signature: response.razorpay_signature,
                        orderId: orderId
                    });

                    if (verifyRes.data.success) {
                        Swal.fire({
                            title: 'Success!',
                            text: 'Payment completed successfully.',
                            icon: 'success',
                            confirmButtonText: 'OK'
                        }).then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire('Error', 'Payment verification failed', 'error');
                    }
                },
                "prefill": {
                    "contact": userPhone
                },
                "theme": {
                    "color": "#002366"
                },
                "modal": {
                    "ondismiss": function () {
                        console.log('Checkout form closed');
                    }
                }
            };

            const rzp1 = new Razorpay(options);
            rzp1.open();
        } else {
            Swal.fire('Error', 'Failed to initiate payment', 'error');
        }
    } catch (error) {
        console.error('Retry error:', error);
        Swal.fire('Error', 'Something went wrong', 'error');
    }
}
