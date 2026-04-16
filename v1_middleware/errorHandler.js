// معالج الأخطاء المركزي
const errorHandler = (err, req, res, next) => {
  console.error('❌ خطأ:', err);

  // أخطاء Multer
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'الملف كبير جداً - الحد الأقصى 50MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'عدد الملفات كبير جداً - الحد الأقصى 10 ملفات'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'ملف غير متوقع'
      });
    }
  }

  // أخطاء نوع الملف
  if (err.message.includes('نوع الملف غير مدعوم')) {
    return res.status(400).json({
      error: err.message
    });
  }

  // أخطاء قاعدة البيانات
  if (err.name === 'MongoError') {
    return res.status(500).json({
      error: 'خطأ في قاعدة البيانات'
    });
  }

  // أخطاء افتراضية
  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في الخادم'
  });
};

module.exports = errorHandler;