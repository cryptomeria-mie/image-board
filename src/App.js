import React, { useState, useEffect } from 'react';
import { Camera, MessageSquare, User, Calendar, Shield, AlertTriangle } from 'lucide-react';

const ImageBoard = () => {
  const [posts, setPosts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    message: '',
    image: null
  });
  const [imagePreview, setImagePreview] = useState(null);
  
  // BOT対策用の状態
  const [captcha, setCaptcha] = useState({ question: '', answer: '', userAnswer: '' });
  const [postingCooldown, setPostingCooldown] = useState(0);
  const [lastPostTime, setLastPostTime] = useState(0);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // CAPTCHA問題を生成
  const generateCaptcha = () => {
    const operations = [
      { type: 'add', symbol: '+' },
      { type: 'subtract', symbol: '-' },
      { type: 'multiply', symbol: '×' }
    ];
    
    const operation = operations[Math.floor(Math.random() * operations.length)];
    let num1, num2, answer;
    
    switch (operation.type) {
      case 'add':
        num1 = Math.floor(Math.random() * 20) + 1;
        num2 = Math.floor(Math.random() * 20) + 1;
        answer = num1 + num2;
        break;
      case 'subtract':
        num1 = Math.floor(Math.random() * 20) + 10;
        num2 = Math.floor(Math.random() * 10) + 1;
        answer = num1 - num2;
        break;
      case 'multiply':
        num1 = Math.floor(Math.random() * 9) + 1;
        num2 = Math.floor(Math.random() * 9) + 1;
        answer = num1 * num2;
        break;
      default:
        num1 = 1; num2 = 1; answer = 2;
    }
    
    setCaptcha({
      question: `${num1} ${operation.symbol} ${num2} = ?`,
      answer: answer.toString(),
      userAnswer: ''
    });
  };

  // クールダウンタイマー
  useEffect(() => {
    if (postingCooldown > 0) {
      const timer = setTimeout(() => {
        setPostingCooldown(postingCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [postingCooldown]);

  // ブロック解除タイマー
  useEffect(() => {
    if (isBlocked) {
      const timer = setTimeout(() => {
        setIsBlocked(false);
        setFailedAttempts(0);
      }, 300000); // 5分でブロック解除
      return () => clearTimeout(timer);
    }
  }, [isBlocked]);

  // 初回CAPTCHA生成
  useEffect(() => {
    generateCaptcha();
  }, []);

  // スパム検出
  const detectSpam = (text) => {
    const spamPatterns = [
      /https?:\/\/\S+/gi, // URL
      /(.)\1{4,}/g, // 同じ文字の連続
      /[！!]{3,}/g, // 感嘆符の連続
      /[？?]{3,}/g, // 疑問符の連続
    ];
    
    return spamPatterns.some(pattern => pattern.test(text));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // プレビュー用のURLを作成
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ブロック中チェック
    if (isBlocked) {
      alert('一時的にブロックされています。しばらくお待ちください。');
      return;
    }
    
    // クールダウン中チェック
    if (postingCooldown > 0) {
      alert(`投稿間隔を空けてください。あと${postingCooldown}秒お待ちください。`);
      return;
    }
    
    // 基本バリデーション
    if (!formData.name.trim() || !formData.message.trim()) {
      alert('名前とメッセージを入力してください');
      return;
    }
    
    // 文字数制限
    if (formData.name.length > 50) {
      alert('名前は50文字以内で入力してください');
      return;
    }
    
    if (formData.message.length > 1000) {
      alert('メッセージは1000文字以内で入力してください');
      return;
    }
    
    // CAPTCHA認証
    if (captcha.userAnswer !== captcha.answer) {
      setFailedAttempts(prev => prev + 1);
      
      if (failedAttempts >= 2) {
        setIsBlocked(true);
        alert('認証に複数回失敗したため、一時的にブロックされました。');
        return;
      }
      
      alert('計算の答えが間違っています。もう一度お試しください。');
      generateCaptcha();
      return;
    }
    
    // スパム検出
    if (detectSpam(formData.message) || detectSpam(formData.name)) {
      setFailedAttempts(prev => prev + 1);
      alert('スパムの可能性があるため投稿できませんでした。');
      
      if (failedAttempts >= 1) {
        setIsBlocked(true);
      }
      return;
    }
    
    // 投稿間隔チェック（30秒）
    const now = Date.now();
    if (lastPostTime && (now - lastPostTime) < 30000) {
      alert('投稿間隔を空けてください。');
      return;
    }

    const newPost = {
      id: Date.now(),
      name: formData.name,
      message: formData.message,
      image: imagePreview,
      timestamp: new Date().toLocaleString('ja-JP')
    };

    setPosts(prev => [newPost, ...prev]);
    
    // フォームをリセット
    setFormData({
      name: '',
      message: '',
      image: null
    });
    setImagePreview(null);
    
    // ファイル入力もリセット
    const fileInput = document.getElementById('imageInput');
    if (fileInput) fileInput.value = '';
    
    // 新しいCAPTCHA生成
    generateCaptcha();
    
    // クールダウン開始
    setPostingCooldown(30);
    setLastPostTime(now);
    setFailedAttempts(0); // 成功時はリセット
  };

  const removeImagePreview = () => {
    setImagePreview(null);
    setFormData(prev => ({
      ...prev,
      image: null
    }));
    const fileInput = document.getElementById('imageInput');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* BOT対策セキュリティ表示 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <Shield className="text-green-600 mr-2" size={20} />
            <span className="text-green-800 font-medium">BOT対策機能が有効です</span>
          </div>
          <div className="text-sm text-green-700 mt-1">
            CAPTCHA認証・投稿間隔制限・スパム検出システムが動作中
          </div>
          {isBlocked && (
            <div className="flex items-center mt-2 text-red-700">
              <AlertTriangle size={16} className="mr-1" />
              <span className="text-sm font-medium">現在ブロック中です（5分後に解除）</span>
            </div>
          )}
        </div>

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            📸 画像掲示板
          </h1>
          <p className="text-gray-600">画像付きで自由に投稿しよう！</p>
        </div>

        {/* 投稿フォーム */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <MessageSquare className="mr-2 text-blue-500" />
            新しい投稿
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline mr-1" size={16} />
                名前 (50文字以内)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                maxLength="50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="あなたの名前を入力..."
                disabled={isBlocked}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.name.length}/50文字
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メッセージ (1000文字以内)
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows="4"
                maxLength="1000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="メッセージを入力..."
                disabled={isBlocked}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.message.length}/1000文字
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Camera className="inline mr-1" size={16} />
                画像
              </label>
              <input
                type="file"
                id="imageInput"
                accept="image/*"
                onChange={handleImageChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isBlocked}
              />
            </div>

            {/* CAPTCHA認証 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="inline mr-1" size={16} />
                BOT対策認証 (必須)
              </label>
              <div className="flex items-center space-x-4">
                <div className="bg-white px-4 py-2 border-2 border-gray-300 rounded-lg font-mono text-lg">
                  {captcha.question}
                </div>
                <input
                  type="number"
                  value={captcha.userAnswer}
                  onChange={(e) => setCaptcha(prev => ({ ...prev, userAnswer: e.target.value }))}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                  placeholder="答え"
                  disabled={isBlocked}
                />
                <button
                  type="button"
                  onClick={generateCaptcha}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                  disabled={isBlocked}
                >
                  更新
                </button>
              </div>
              {failedAttempts > 0 && (
                <div className="text-red-600 text-sm mt-2">
                  認証失敗: {failedAttempts}/3回 (3回失敗でブロック)
                </div>
              )}
            </div>

            {/* 画像プレビュー */}
            {imagePreview && (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="プレビュー"
                  className="max-w-full h-48 object-cover rounded-lg border-2 border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImagePreview}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            )}

            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isBlocked || postingCooldown > 0}
              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg ${
                isBlocked || postingCooldown > 0
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
              }`}
            >
              {isBlocked 
                ? '一時的にブロック中' 
                : postingCooldown > 0 
                  ? `投稿まで ${postingCooldown}秒` 
                  : '投稿する'
              }
            </button>
          </div>
        </div>

        {/* 投稿一覧 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            投稿一覧 ({posts.length}件)
          </h2>
          
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow-lg">
              <div className="text-gray-400 text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg">まだ投稿がありません</p>
              <p className="text-gray-400">最初の投稿をしてみましょう！</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {post.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-semibold text-gray-800">{post.name}</p>
                        <p className="text-sm text-gray-500 flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {post.timestamp}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-wrap">
                    {post.message}
                  </p>
                  
                  {post.image && (
                    <div className="mt-4">
                      <img
                        src={post.image}
                        alt="投稿画像"
                        className="max-w-full h-auto rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(post.image, '_blank')}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageBoard;