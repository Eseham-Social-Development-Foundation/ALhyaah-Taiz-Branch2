const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Routes
const fileRoutes = require('./routes/fileRoutes');

// استخدام المسارات
app.use('/api/files', fileRoutes);

// مسار الصحة
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'الخادم يعمل بشكل صحيح',
    timestamp: new Date().toISOString()
  });
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// اتصال قاعدة البيانات
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/alhyaah-uploads', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.log('✅ متصل بقاعدة البيانات بنجاح');
    console.log(`📍 MongoDB: ${process.env.MONGODB_URI}`);
  })
  .catch((err) => {
    console.error('❌ خطأ الاتصال بقاعدة البيانات:', err.message);
    process.exit(1);
  });

// معالج الأخطاء
app.use((err, req, res, next) => {
  console.error('❌ خطأ:', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'حدث خطأ في الخادم',
    timestamp: new Date().toISOString()
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'المسار غير موجود',
    path: req.path,
    method: req.method
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
    🚀 نظام رفع الملفات
    ════════════════════════════════════
    🌐 الخادم: http://localhost:${PORT}
    📊 API: http://localhost:${PORT}/api
    📁 الملفات: http://localhost:${PORT}/uploads
    ════════════════════════════════════
  `);
});

// معالجة الأخطاء غير المتوقعة
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

module.exports = server;