import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Client {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column()
	name: string;

	@Column({ unique: true })
	apiKey: string;

	@Column()
	emailReceiver: string;

	@CreateDateColumn()
	createdAt: Date;
}