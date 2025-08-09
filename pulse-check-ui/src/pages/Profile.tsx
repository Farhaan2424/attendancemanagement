export default function Profile() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Profile</h2>
      <p><strong>Name:</strong> {user.username}</p>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Role:</strong> {user.role?.name}</p>
    </div>
  );
}
