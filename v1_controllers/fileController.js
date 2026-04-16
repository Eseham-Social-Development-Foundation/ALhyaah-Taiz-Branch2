const File = require('../models/File');
const fs = require('fs');
const path = require('path');

class FileController {
  // رفع ملف واحد
  static async uploadSingle(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'لم يتم اختيار ملف' });
      }

      const newFile = new File({
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        filepath: req.file.path,
        url: `/uploads/${req.file.filename}`,
        uploadedBy: req.body.uploadedBy || 'anonymous'
      });

      await newFile.save();

      res.status(201).json({
        success: true,
        message: 'تم رفع الملف بنجاح',
        file: newFile
      });
    } catch (error) {
      next(error);
    }
  }

  // رفع ملفات متعددة
  static async uploadMultiple(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'لم يتم اختيار ملفات' });
      }

      const savedFiles = [];

      for (const file of req.files) {
        const newFile = new File({
          filename: file.filename,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          filepath: file.path,
          url: `/uploads/${file.filename}`,
          uploadedBy: req.body.uploadedBy || 'anonymous'
        });

        const savedFile = await newFile.save();
        savedFiles.push(savedFile);
      }

      res.status(201).json({
        success: true,
        message: `تم رفع ${savedFiles.length} ملفات بنجاح`,
        files: savedFiles
      });
    } catch (error) {
      next(error);
    }
  }

  // الحصول على جميع الملفات
  static async getAllFiles(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const files = await File.find()
        .sort({ uploadedAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await File.countDocuments();

      res.json({
        success: true,
        count: files.length,
        total: total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        files: files
      });
    } catch (error) {
      next(error);
    }
  }

  // الحصول على ملف واحد
  static async getFile(req, res, next) {
    try {
      const file = await File.findById(req.params.id);

      if (!file) {
        return res.status(404).json({ error: 'الملف غير موجود' });
      }

      res.json({
        success: true,
        file: file
      });
    } catch (error) {
      next(error);
    }
  }

  // حذف ملف
  static async deleteFile(req, res, next) {
    try {
      const file = await File.findByIdAndDelete(req.params.id);

      if (!file) {
        return res.status(404).json({ error: 'الملف غير موجود' });
      }

      // حذف الملف من النظام
      const filePath = path.join(__dirname, '../', file.filepath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      res.json({
        success: true,
        message: 'تم حذف الملف بنجاح'
      });
    } catch (error) {
      next(error);
    }
  }

  // البحث عن ملفات
  static async searchFiles(req, res, next) {
    try {
      const { query } = req.query;

      if (!query) {
        return res.status(400).json({ error: 'يجب إدخال كلمة البحث' });
      }

      const files = await File.find({
        $or: [
          { originalname: { $regex: query, $options: 'i' } },
          { uploadedBy: { $regex: query, $options: 'i' } }
        ]
      }).sort({ uploadedAt: -1 });

      res.json({
        success: true,
        count: files.length,
        files: files
      });
    } catch (error) {
      next(error);
    }
  }

  // إحصائيات الملفات
  static async getStats(req, res, next) {
    try {
      const totalFiles = await File.countDocuments();
      const totalSize = await File.aggregate([
        {
          $group: {
            _id: null,
            totalSize: { $sum: '$size' }
          }
        }
      ]);

      const filesByType = await File.aggregate([
        {
          $group: {
            _id: '$mimetype',
            count: { $sum: 1 }
          }
        }
      ]);

      res.json({
        success: true,
        stats: {
          totalFiles: totalFiles,
          totalSize: totalSize[0]?.totalSize || 0,
          filesByType: filesByType
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = FileController;