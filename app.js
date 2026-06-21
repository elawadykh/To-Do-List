// Firebase SDK (Firestore + Auth)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, addDoc, deleteDoc, doc, onSnapshot, query, where, updateDoc, getDocs, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyD3lL8FGKLG6ox278q3FEc2QUrzayA-ogw",
  authDomain: "to-do-list-37201.firebaseapp.com",
  projectId: "to-do-list-37201",
  storageBucket: "to-do-list-37201.firebasestorage.app",
  messagingSenderId: "558529326511",
  appId: "1:558529326511:web:f562daf7c8bd7b0044535a",
  measurementId: "G-N31YZ2699T"
};

// Firestore and Firebase Authentication
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
const auth = getAuth(app);

// link html elements to javascript
const todoInput = document.getElementById("todo-input");
const addBtn = document.getElementById("add-btn");
const todoList = document.getElementById("todo-list");
const logoutBtn = document.getElementById("logout-btn");
const todoRecurring = document.getElementById("todo-recurring");

// login/signup form elements
const authContainer = document.getElementById('auth-container');
const todoContainer = document.getElementById('todo-container');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authTitle = document.getElementById('auth-title');
const toggleAuthMode = document.getElementById('toggle-auth-mode');
const googleBtn = document.getElementById('google-btn');
const provider = new GoogleAuthProvider();

let isLoginMode = true; 
let unsubscribeTodos = null; // store the unsubscribe function for firestore listener

// Function to show toast notifications
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    // Text container
    const textSpan = document.createElement("span");
    textSpan.innerText = message;
    toast.appendChild(textSpan);

    // Close button
    const closeBtn = document.createElement("button");
    closeBtn.className = "toast-close-btn";
    closeBtn.innerHTML = "&times;"; // "×" symbol
    closeBtn.addEventListener("click", () => {
        dismissToast(toast);
    });
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    let isDismissed = false;
    function dismissToast(el) {
        if (isDismissed) return;
        isDismissed = true;
        el.classList.add("fade-out");
        
        // Remove from DOM after transition finishes (300ms)
        setTimeout(() => {
            el.remove();
        }, 300);
    }

    // Fade out and remove automatically after 5 seconds
    setTimeout(() => {
        dismissToast(toast);
    }, 5000);
}

// Function to translate Firebase error codes to friendly Arabic messages
function getFriendlyErrorMessage(error) {
    const code = error?.code || error?.message || "";
    if (code.includes("auth/invalid-credential") || code.includes("auth/user-not-found") || code.includes("auth/wrong-password")) {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة. ❌";
    }
    if (code.includes("auth/email-already-in-use")) {
        return "هذا البريد الإلكتروني مسجل بالفعل. 📧";
    }
    if (code.includes("auth/weak-password")) {
        return "كلمة المرور ضعيفة جداً (يجب أن تكون 6 أحرف على الأقل). 🔒";
    }
    if (code.includes("auth/invalid-email")) {
        return "صيغة البريد الإلكتروني غير صحيحة. ✉️";
    }
    if (code.includes("auth/network-request-failed")) {
        return "مشكلة في الاتصال بالإنترنت. 🌐";
    }
    // Default error message
    return "حدث خطأ ما، يرجى المحاولة مرة أخرى.";
}

// toggle login/signup mode
toggleAuthMode.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    if (!isLoginMode) {
        authTitle.innerText = "إنشاء حساب جديد";
        authSubmitBtn.innerText = "تسجيل الحساب";
        toggleAuthMode.innerText = "تسجيل الدخول بدلاً من ذلك";
    } else {
        authTitle.innerText = "تسجيل الدخول";
        authSubmitBtn.innerText = "دخول";
        toggleAuthMode.innerText = "إنشاء حساب جديد";
    }
});

// sign in/up with email and password
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = authEmail.value;
    const password = authPassword.value;

    if (isLoginMode) {
        // sign in with email and password
        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                showToast("تم تسجيل الدخول بنجاح! 🎉", "success");
            })
            .catch((error) => {
                showToast(getFriendlyErrorMessage(error), "error");
            });
    } else {
        // create new account
        createUserWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                showToast("تم إنشاء الحساب بنجاح! 🎉 تم تسجيل دخولك تلقائياً.", "success");
            })
            .catch((error) => {
                showToast(getFriendlyErrorMessage(error), "error");
            });
    }
});

// Function to start listening to user's todos
function startListeningToTodos(userId) {
    // If we're already listening, unsubscribe first
    if (unsubscribeTodos) {
        unsubscribeTodos();
    }

    // Query only current user's todos
    const q = query(collection(db, "todos"), where("userId", "==", userId));

    unsubscribeTodos = onSnapshot(q, (snapshot) => {
        todoList.innerHTML = ""; 
        const tasks = [];

        snapshot.forEach((documentSnapshot) => {
            const task = documentSnapshot.data();
            tasks.push({
                id: documentSnapshot.id,
                ...task
            });
        });

        // Sort tasks client-side by creation date (oldest first)
        tasks.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeA - timeB;
        });

        tasks.forEach((task) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <div class="task-content">
                    <input type="checkbox" class="task-checkbox" data-id="${task.id}" ${task.completed ? 'checked' : ''}>
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text} ${task.recurring ? '🔄' : ''}</span>
                </div>
                <button class="delete-btn" data-id="${task.id}">مسح</button>
            `;
            todoList.appendChild(li);
        });

        setupDeleteButtons();
        setupCheckboxListeners();
    }, (error) => {
        console.error("خطأ أثناء جلب المهام: ", error);
    });
}

// setup checkbox click listeners
function setupCheckboxListeners() {
    const checkboxes = document.querySelectorAll(".task-checkbox");
    checkboxes.forEach(chk => {
        chk.addEventListener("change", async (e) => {
            const id = e.target.getAttribute("data-id");
            const completed = e.target.checked;
            try {
                await updateDoc(doc(db, "todos", id), {
                    completed: completed
                });
            } catch (error) {
                showToast("خطأ أثناء تحديث حالة المهمة", "error");
                console.error("خطأ أثناء تحديث المهمة: ", error);
                e.target.checked = !completed; // revert on error
            }
        });
    });
}

// Function to check and run daily cleanup at dawn (4:00 AM)
async function checkAndRunCleanup(userId) {
    const today = new Date();
    const cleanupKey = `lastCleanupDate_${userId}`;
    const lastCleanup = localStorage.getItem(cleanupKey);

    const todaysDawn = new Date(today);
    todaysDawn.setHours(4, 0, 0, 0);

    let needsCleanup = false;
    if (!lastCleanup) {
        needsCleanup = true;
    } else {
        const lastCleanupDate = new Date(lastCleanup);
        if (lastCleanupDate < todaysDawn && today >= todaysDawn) {
            needsCleanup = true;
        }
    }

    if (needsCleanup) {
        console.log("جارٍ تشغيل التنظيف التلقائي الفجر للمهام...");
        try {
            const q = query(collection(db, "todos"), where("userId", "==", userId));
            const querySnapshot = await getDocs(q);
            
            const batch = writeBatch(db);
            let hasOperations = false;

            querySnapshot.forEach((docSnap) => {
                const task = docSnap.data();
                const taskId = docSnap.id;

                if (task.completed === true) {
                    const taskRef = doc(db, "todos", taskId);
                    if (task.recurring === true) {
                        batch.update(taskRef, { completed: false });
                        hasOperations = true;
                    } else {
                        batch.delete(taskRef);
                        hasOperations = true;
                    }
                }
            });

            if (hasOperations) {
                await batch.commit();
                showToast("تم تنظيف وتصفير المهام لليوم الجديد! 🧹", "success");
            }
            
            localStorage.setItem(cleanupKey, today.toISOString());
        } catch (error) {
            console.error("خطأ أثناء التنظيف التلقائي: ", error);
        }
    }
}

// switch login mode and user mode
onAuthStateChanged(auth, (user) => {
    if (user) {
        // show todo list and hide login form
        authContainer.classList.add('hidden');
        todoContainer.classList.remove('hidden');
        console.log("المستخدم الحالي:", user.uid);
        
        // Run daily cleanup first
        checkAndRunCleanup(user.uid);
        
        // Start listening to user's tasks
        startListeningToTodos(user.uid);
    } else {
        // Unsubscribe from firestore updates when logged out
        if (unsubscribeTodos) {
            unsubscribeTodos();
            unsubscribeTodos = null;
        }
        // clear UI tasks list
        todoList.innerHTML = "";

        // show login form and hide todo list
        authContainer.classList.remove('hidden');
        todoContainer.classList.add('hidden');
    }
});

// add new task to firebase
addBtn.addEventListener("click", async () => {
    const taskText = todoInput.value.trim();
    const user = auth.currentUser;
    
    if (!user) {
        showToast("يجب تسجيل الدخول أولاً!", "error");
        return;
    }
    
    if (taskText === "") {
        showToast("ايه المهمه الفاضيه دي 😆", "info");
        return;
    }

    try {
        const isRecurring = todoRecurring.checked;
        
        // Run without await so the input field clears immediately (even when offline)
        addDoc(collection(db, "todos"), {
            text: taskText,
            createdAt: new Date(),
            userId: user.uid, // associate task with the authenticated user
            completed: false,
            recurring: isRecurring
        }).catch((error) => {
            showToast("خطأ أثناء إضافة المهمة", "error");
            console.error("خطأ أثناء إضافة المهمة في الخلفية: ", error);
        });
        
        todoInput.value = ""; 
        todoRecurring.checked = false; // reset checkbox
    } catch (error) {
        showToast("خطأ أثناء إضافة المهمة", "error");
        console.error("خطا اثناء إضافة المهمه: ", error);
    }
});

// delete task from firebase
function setupDeleteButtons() {
    const deleteButtons = document.querySelectorAll(".delete-btn");
    deleteButtons.forEach(btn => {
        btn.replaceWith(btn.cloneNode(true)); // remove old listeners to prevent duplicates
    });
    
    const newDeleteButtons = document.querySelectorAll(".delete-btn");
    newDeleteButtons.forEach(btn => {
        btn.addEventListener("click", async (e) => {
            const id = e.target.getAttribute("data-id");
            try {
                await deleteDoc(doc(db, "todos", id));
            } catch (error) {
                console.error("خطأ أثناء مسح المهمة: ", error);
            }
        });
    });
}

// sign in with google
googleBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider)
        .then((result) => {
            showToast("تم تسجيل الدخول بحساب جوجل بنجاح! 🚀", "success");
        })
        .catch((error) => {
            showToast(getFriendlyErrorMessage(error), "error");
        });
});

// sign out button listener
logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => {
        showToast("تم تسجيل الخروج بنجاح!", "success");
    }).catch((error) => {
        showToast(getFriendlyErrorMessage(error), "error");
    });
});

// Register Service Worker for PWA (offline reload capability)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((reg) => {
                console.log('Service Worker registered successfully with scope:', reg.scope);
            })
            .catch((err) => {
                console.error('Service Worker registration failed:', err);
            });
    });
}