const pageNotFound = async(req,res)=>{
    try{
        return res.render('page-404')
    }catch(error){
        res.redirect('/pageNotFound')
    }
}


const loadHomepage = async(req,res)=>{
    try{
        return res.render('user/home', {
        layout: "layout",
        user: req.user || null,
        cartCount: req.session?.cart?.length || 0
    })
    }catch(error){
        console.log("Home page not found")
        res.status(500).send('Server error')
    }
}

module.exports = {
    loadHomepage,
    pageNotFound
}