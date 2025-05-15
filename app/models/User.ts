export default class User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: Date;
  videos: string[];

  constructor(id: string, email: string, firstName: string, lastName: string) {
    this.id = id;
    this.email = email;
    this.firstName = firstName;
    this.lastName = lastName;
    this.createdAt = new Date();
    this.videos = [];
  }

  // Add any authentication-related methods here
  static fromJson(json: any): User {
    return new User(json.id, json.email, json.firstName, json.lastName);
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      createdAt: this.createdAt,
    };
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
