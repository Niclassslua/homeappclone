import React from 'react';
import Pointer from './Pointer';

const Pointers = ({ pointers, settings, svg, $svg, data, setPointer, selectedPointerId }) => {
    const pointerList = (pointers && pointers.pointers) || [];
    return (
        <>
            {pointerList.map((pointer) => (
                <Pointer
                    key={pointer.id}
                    pointer={pointer}
                    svg={svg}
                    settings={settings}
                    $svg={$svg}
                    data={data}
                    setPointer={setPointer}
                    selectedPointerId={selectedPointerId}
                />
            ))}
        </>
    );
};

export default Pointers;
