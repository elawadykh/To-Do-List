// 1. استدعاء الميزات اللي محتاجينها من Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. كود الربط الخاص بمشروعك (Firebase Config)
const firebaseConfig = {
  apiKey: "AIzaSyD3lL8FGKLG6ox278q3FEc2QUrzayA-ogw",
  authDomain: "to-do-list-37201.firebaseapp.com",
  projectId: "to-do-list-37201",
  storageBucket: "to-do-list-37201.firebasestorage.app",
  messagingSenderId: "558529326511",
  appId: "1:558529326511:web:f562daf7c8bd7b0044535a",
  measurementId: "G-N31YZ2699T"
};

// تهيئة Firebase والـ Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 3. ربط عناصر الـ HTML بالـ JavaScript
const todoInput = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const todoList = document.getElementById("todo-list");

// 4. دالة إضافة مهمة جديدة لـ Firebase
addBtn.addEventListener("click", async () => {
    const taskText = todoInput.value.trim();
    
    if (taskText === "") {
        alert("اكتب حاجة الأول يا خالد! 😉");
        return;
    }

    try {
        // بنبعت البيانات لجدول (Collection) في الداتابيز هنسميه "todos"
        await addDoc(collection(db, "todos"), {
            text: taskText,
            createdAt: new Date() // بنسجل وقت الكتابة عشان الترتيب بعدين
        });
        
        todoInput.value = ""; // فضي المربع بعد الإضافة
    } catch (error) {
        console.error("حصل مشكلة وأحنا بنرفع المهمة: ", error);
    }
});

// 5. دالة قراءة البيانات وعرضها في السيرفر بشكل مباشر (Real-time)
// الميزة هنا إن أي تغيير في الداتابيز هيسمع في الشاشة فوراً
onSnapshot(collection(db, "todos"), (snapshot) => {
    todoList.innerHTML = ""; // فضي القائمة عشان نعيد رسمها بالبيانات الجديدة
    
    snapshot.forEach((documentSnapshot) => {
        const task = documentSnapshot.data();
        const taskId = documentSnapshot.id; // بناخد الـ ID المميز بتاع المهمة عشان لو حبينا نمسحها

        // إنشاء عنصر li للمهمة
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${task.text}</span>
            <button class="delete-btn" data-id="${taskId}">مسح</button>
        `;
        
        todoList.appendChild(li);
    });

    // ربط أزرار المسح بالدالة بتاعتها
    setupDeleteButtons();
});

// 6. دالة مسح المهمة من Firebase
function setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            // مسح المستند من الـ Firestore باستخدام الـ ID بتاعه
            await deleteDoc(doc(db, "todos", id));
        });
    });
}