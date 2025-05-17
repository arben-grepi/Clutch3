export default class User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  videos: string[];
  profilePicture: string | null;
  files: any[];

  constructor(
    id: string,
    email: string,
    firstName: string,
    lastName: string,
    profilePicture: string | null = null
  ) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.createdAt = new Date();
    this.videos = [];
    this.profilePicture = profilePicture;
    this.files = [];
  }

  // Add any authentication-related methods here
  static fromJson(json: any): User {
    const user = new User(
      json.id,
      json.email,
      json.firstName,
      json.lastName,
      json.profilePicture || null
    );
    user.files = json.files || [];
    return user;
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      createdAt: this.createdAt,
      profilePicture: this.profilePicture,
      files: this.files,
    };
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
