import React from 'react';

const Demo: React.FC = () => {
    const handleClick = () => {
        console.log('Demo function called!');
    };

    return (
        <div>
             <h1>Hello this is Demo</h1>
            <button onClick={handleClick}>Call Demo Function</button>
        </div>
      
    );
};

export default Demo;