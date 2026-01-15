```markdown
# 🍔 Tastio Server — Backend API

The backend server for **Tastio**, a multi-vendor food review and discovery platform. This RESTful API is built with **Node.js, Express.js, and MongoDB**, handling authentication via **Firebase Admin SDK** and managing complex data relationships using MongoDB Aggregation pipelines.

## 🚀 Key Features

*   **Secure Authentication:** Middleware using Firebase Admin SDK to verify tokens.
*   **Role-Based Access Control (RBAC):** Custom middleware to protect routes for **Admins**, **Sellers**, and **Users**.
*   **Advanced Search & Filtering:** Server-side logic for searching foods by name, category, price range, and sorting.
*   **Data Aggregation:** Complex MongoDB pipelines used for:
    *   **Leaderboard:** Ranking top reviewers.
    *   **Analytics:** Calculating stats for Admin and Seller dashboards.
    *   **Joins:** Merging data between Reviews, Users, and Restaurants collections.
*   **Seller Management:** Workflow for applying, approving, and rejecting restaurant partners.

---

## 🛠️ Tech Stack

*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Framework:** [Express.js](https://expressjs.com/)
*   **Database:** [MongoDB](https://www.mongodb.com/) (Native Driver)
*   **Authentication:** [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
*   **Utilities:** `dotenv` (Env variables), `cors` (Cross-Origin Resource Sharing).

---

## ⚙️ Local Setup & Installation

### 1. Clone the Repository
```bash
git clone https://github.com/hasnatfahmidkhan/tastio-server.git
cd tastio/server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root of the server directory. You need to configure MongoDB and Firebase Admin.

> **Note on Firebase Service Key:**
> This project expects the Firebase Service Account JSON to be **Base64 encoded** into a single string to avoid parsing issues in deployment environments.

**How to get `FB_SERVICE_KEY`:**
1.  Go to Firebase Console > Project Settings > Service Accounts.
2.  Generate a new Private Key (downloads a JSON file).
3.  Convert the entire JSON string to Base64 (use an online tool or terminal).

**`.env` File Structure:**
```env
# MongoDB Credentials
DB_USER=your_mongodb_username
DB_PASS=your_mongodb_password

# Firebase Admin SDK (Base64 Encoded JSON)
FB_SERVICE_KEY=your_base64_encoded_service_account_json
```

### 4. Run the Server
```bash
# For development (with nodemon)
npm run start
# OR
node index.js
```
Server will run on `http://localhost:3000`.

---

## 📡 API Documentation

### 🔐 Authentication & Roles
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/users` | Public | Register a new user in MongoDB. |
| `GET` | `/users/:email/role` | Public | Check if a user is Admin, Seller, or User. |

### 🍔 Foods & Menu
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/all-foods` | Public | Get foods with Search, Filter (Category, Price), Pagination & Sort. |
| `GET` | `/menu/:id` | Public | Get single food details + Restaurant info. |
| `GET` | `/foods/trending` | Public | Get trending foods sorted by reviews. |
| `GET` | `/foods/top-rated` | Public | Get top-rated foods sorted by rating. |
| `POST` | `/menu` | Seller | Add a new food item. |
| `PATCH` | `/menu/:id` | Seller | Update food details. |
| `DELETE` | `/menu/:id` | Seller | Delete a food item (Own food only). |

### 🏪 Restaurants (Sellers)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/restaurants` | Public | Get all verified restaurants (Supports Search). |
| `GET` | `/restaurants/:id` | Public | Get single restaurant details + Menu. |
| `POST` | `/restaurants` | User | Apply to become a seller. |
| `GET` | `/restaurants/status/:email` | User | Check application status (Pending/Verified/Rejected). |
| `PATCH` | `/restaurants/verify/:id` | Admin | Approve seller application. |
| `PATCH` | `/restaurants/reject/:id` | Admin | Reject seller application with reason. |

### 📝 Reviews
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/all-reviews` | Public | Get reviews with Search, Filter & Pagination. |
| `GET` | `/latest-reviews` | Public | Get 4 most recent reviews. |
| `POST` | `/reviews` | User | Post a review (Updates Food Avg Rating). |
| `GET` | `/my-reviews` | User | Get logged-in user's reviews. |
| `DELETE` | `/my-reviews/:id` | User | Delete own review. |

### 💬 Community Feed
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/posts` | Public | Get social feed posts. |
| `POST` | `/posts` | User | Create a social post. |
| `PATCH` | `/posts/like/:id` | User | Toggle Like on a post. |

### 📊 Analytics & Admin
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/admin-stats` | Admin | Get total Users, Revenue, Reviews & Charts data. |
| `GET` | `/users` | Admin | Manage all users (Filter by Role). |
| `GET` | `/seller-stats/:email` | Seller | Get seller specific stats (Sales, Review count). |

---

## 🧠 Aggregation Logic Highlights

This API heavily relies on MongoDB Aggregation Framework for performance.

**Example: Leaderboard (`/leaderboard`)**
1.  Groups reviews by `reviewerEmail`.
2.  Counts total reviews.
3.  Sorts by count descending.
4.  Lookup (Join) with `users` collection to get Name & Photo.
5.  Projects final data structure.

**Example: Review + Restaurant Join**
When fetching reviews, we use `$lookup` to join the `restaurants` collection using `restaurantId`. This allows the frontend to display the Restaurant Name and Location inside the review card without making a second API call.

---

## 🚀 Deployment

The server is configured to run on **Vercel** or **Render**.

**`vercel.json` Configuration:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "index.js"
    }
  ]
}
```

---

## 👨‍💻 Author

**Hasnat Fahmid**  
Full Stack Developer
```