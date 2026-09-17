import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  children: React.ReactNode;
}

export const Card = ({ interactive = false, className = '', children, ...props }: CardProps) => {
  const cardClasses = `${styles.card} ${interactive ? styles.interactive : ''} ${className}`;
  return (
    <div className={cardClasses} {...props}>
      {children}
    </div>
  );
};

export const CardHeader = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`${styles.header} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardTitle = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
  return (
    <h3 className={`${styles.title} ${className}`} {...props}>
      {children}
    </h3>
  );
};

export const CardDescription = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
  return (
    <p className={`${styles.description} ${className}`} {...props}>
      {children}
    </p>
  );
};

export const CardContent = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`${styles.content} ${className}`} {...props}>
      {children}
    </div>
  );
};

export const CardFooter = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return (
    <div className={`${styles.footer} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
