export default class User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;

  constructor(id: string, email: string, name: string) {
    this.id = id;
    this.email = email;
    this.name = name;
    this.createdAt = new Date();
  }

  // Add any authentication-related methods here
  static fromJson(json: any): User {
    return new User(json.id, json.email, json.name);
  }

  toJson(): any {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      createdAt: this.createdAt,
    };
  }
}
